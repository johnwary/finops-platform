import { Decimal } from '@prisma/client/runtime/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Same harness as every other service test: mock the prisma singleton, assert
// on the calls. reports.service is read-only aggregation, so the contract we
// verify is (a) the numbers it derives from aggregate results and (b) the
// `where` filters it sends — those filters ARE the "exclude reversed /
// soft-deleted" rule. (CLAUDE.md's SQLite-in-memory claim is stale; the code
// mocks prisma.)
const mocks = vi.hoisted(() => ({
  prisma: {
    borrower: { count: vi.fn() },
    loan: { groupBy: vi.fn(), aggregate: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    loanPayment: { aggregate: vi.fn() },
    capitalEntry: { aggregate: vi.fn() },
  },
}));

vi.mock('../../lib/prisma', () => ({ prisma: mocks.prisma }));

import { resolveProvisionBucket } from '../../lib/lending.js';
import { getOverdue, getPortfolioAtRisk, getSummary } from './reports.service.js';

// getSummary fires 11 prisma calls via Promise.all, in this order.
const AGG_ZERO = { _sum: {}, _count: 0 };

function stubSummaryCalls(overrides: {
  activeBorrowers?: number;
  newBorrowers?: number;
  loanCounts?: Array<{ status: string; _count: number }>;
  loanAmounts?: Array<{ status: string; _sum: Record<string, Decimal> }>;
  activePortfolio?: unknown;
  periodCollections?: unknown;
  capitalInflow?: unknown;
  capitalOutflow?: unknown;
  periodInflow?: unknown;
  periodOutflow?: unknown;
  periodDisbursements?: unknown;
} = {}) {
  mocks.prisma.borrower.count
    .mockResolvedValueOnce(overrides.activeBorrowers ?? 0) // active
    .mockResolvedValueOnce(overrides.newBorrowers ?? 0); // new in period

  mocks.prisma.loan.groupBy
    .mockResolvedValueOnce(overrides.loanCounts ?? []) // counts
    .mockResolvedValueOnce(overrides.loanAmounts ?? []); // amounts

  mocks.prisma.loan.aggregate
    .mockResolvedValueOnce(overrides.activePortfolio ?? AGG_ZERO) // outstanding portfolio
    .mockResolvedValueOnce(overrides.periodDisbursements ?? AGG_ZERO); // period disbursements

  mocks.prisma.loanPayment.aggregate.mockResolvedValueOnce(overrides.periodCollections ?? AGG_ZERO);

  mocks.prisma.capitalEntry.aggregate
    .mockResolvedValueOnce(overrides.capitalInflow ?? AGG_ZERO)
    .mockResolvedValueOnce(overrides.capitalOutflow ?? AGG_ZERO)
    .mockResolvedValueOnce(overrides.periodInflow ?? AGG_ZERO)
    .mockResolvedValueOnce(overrides.periodOutflow ?? AGG_ZERO);
}

// ── getSummary: totals correct across loans / deposits / funds / payments ──────

describe('reports.service getSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes net capital, collections, and per-status loan totals from a mix', async () => {
    stubSummaryCalls({
      activeBorrowers: 5,
      newBorrowers: 2,
      loanCounts: [
        { status: 'ACTIVE', _count: 3 },
        { status: 'PAID', _count: 1 },
      ],
      loanAmounts: [
        {
          status: 'ACTIVE',
          _sum: { amount: new Decimal(3000), remainingBalance: new Decimal(2100), totalPaid: new Decimal(900) },
        },
        {
          status: 'PAID',
          _sum: { amount: new Decimal(1000), remainingBalance: new Decimal(0), totalPaid: new Decimal(1000) },
        },
      ],
      activePortfolio: {
        _count: 3,
        _sum: { amount: new Decimal(3000), remainingBalance: new Decimal(2100), totalPaid: new Decimal(900) },
      },
      periodCollections: {
        _count: 4,
        _sum: { amount: new Decimal(500), principalPortion: new Decimal(400), interestPortion: new Decimal(100) },
      },
      // funds (BUSINESS_CAPITAL) + payments + fees all roll into capital inflow;
      // disbursements roll into outflow. Net = 60000 - 20000.
      capitalInflow: { _sum: { amount: new Decimal(60_000) } },
      capitalOutflow: { _sum: { amount: new Decimal(20_000) } },
      periodInflow: { _sum: { amount: new Decimal(6000) } },
      periodOutflow: { _sum: { amount: new Decimal(2000) } },
      periodDisbursements: { _count: 2, _sum: { amount: new Decimal(4000) } },
    });

    const r = await getSummary({ period: 'month' });

    expect(r.borrowers).toEqual({ total: 5, newInPeriod: 2 });

    expect(r.loans.byStatus.active).toEqual({
      count: 3,
      amount: '3000.00',
      remainingBalance: '2100.00',
      totalPaid: '900.00',
    });
    expect(r.loans.byStatus.paid.count).toBe(1);
    // A status with no rows falls back to zeroes, not undefined.
    expect(r.loans.byStatus.defaulted).toEqual({
      count: 0,
      amount: '0.00',
      remainingBalance: '0.00',
      totalPaid: '0.00',
    });

    expect(r.loans.activePortfolio).toEqual({
      count: 3,
      totalDisbursed: '3000.00',
      totalRemaining: '2100.00',
      totalCollected: '900.00',
    });
    expect(r.loans.periodDisbursements).toEqual({ count: 2, amount: '4000.00' });

    expect(r.collections.inPeriod).toEqual({
      count: 4,
      amount: '500.00',
      principalPortion: '400.00',
      interestPortion: '100.00',
    });

    expect(r.capital.allTime).toEqual({
      totalInflow: '60000.00',
      totalOutflow: '20000.00',
      netCapital: '40000.00',
    });
    expect(r.capital.inPeriod).toEqual({ inflow: '6000.00', outflow: '2000.00', net: '4000.00' });
  });

  it('returns zeroes (never undefined/NaN) when there is no data at all', async () => {
    stubSummaryCalls();

    const r = await getSummary({ period: 'month' });

    expect(r.capital.allTime).toEqual({ totalInflow: '0.00', totalOutflow: '0.00', netCapital: '0.00' });
    expect(r.loans.activePortfolio.totalRemaining).toBe('0.00');
    expect(r.collections.inPeriod.amount).toBe('0.00');
  });

  it('EXCLUDES reversed payments and soft-deleted records from every rollup', async () => {
    stubSummaryCalls();
    await getSummary({ period: 'month' });

    // Borrowers: soft-delete filter on both counts.
    for (const call of mocks.prisma.borrower.count.mock.calls) {
      expect(call[0].where).toMatchObject({ deletedAt: null });
    }

    // Loan groupBy + aggregates: soft-delete filter everywhere.
    for (const call of mocks.prisma.loan.groupBy.mock.calls) {
      expect(call[0].where).toMatchObject({ deletedAt: null });
    }
    for (const call of mocks.prisma.loan.aggregate.mock.calls) {
      expect(call[0].where).toMatchObject({ deletedAt: null });
    }

    // Collections are historical cash movements: reversed payments are excluded,
    // but payments survive an operational loan soft delete.
    const paymentWhere = mocks.prisma.loanPayment.aggregate.mock.calls[0][0].where;
    expect(paymentWhere).toMatchObject({ reversedAt: null });
    expect(paymentWhere).not.toHaveProperty('loan');

    // Capital: every aggregate excludes reversed entries.
    for (const call of mocks.prisma.capitalEntry.aggregate.mock.calls) {
      expect(call[0].where).toMatchObject({ reversedAt: null });
    }
  });
});

// ── getOverdue: correct loans + days-past-due ─────────────────────────────────

describe('reports.service getOverdue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('scopes both the page and the count to outstanding, non-deleted loans with an OVERDUE installment', async () => {
    mocks.prisma.loan.findMany.mockResolvedValue([]);
    mocks.prisma.loan.count.mockResolvedValue(0);

    await getOverdue({ limit: 100 });

    const scope = {
      status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] },
      deletedAt: null,
      loanInstallments: { some: { status: 'OVERDUE' } },
    };
    expect(mocks.prisma.loan.findMany.mock.calls[0][0].where).toMatchObject(scope);
    expect(mocks.prisma.loan.count.mock.calls[0][0].where).toMatchObject(scope);
  });

  it('paginates: over-fetches limit+1, trims the page, and emits a nextCursor when there is more', async () => {
    const mkLoan = (id: string) => ({
      id,
      amount: new Decimal(1000),
      remainingBalance: new Decimal(1000),
      type: 'PERSONAL',
      disbursedAt: new Date('2025-12-01'),
      borrower: { id, firstName: 'X', middleName: null, lastName: 'Y', email: 'x@x.ph', phone: '1' },
      loanInstallments: [{ dueDate: new Date('2026-01-22') }],
    });
    // limit=2 → service over-fetches 3; the extra row signals hasMore.
    mocks.prisma.loan.findMany.mockResolvedValue([mkLoan('l1'), mkLoan('l2'), mkLoan('l3')]);
    mocks.prisma.loan.count.mockResolvedValue(9);

    const r = await getOverdue({ limit: 2 });

    expect(mocks.prisma.loan.findMany.mock.calls[0][0].take).toBe(3); // limit + 1
    expect(r.data).toHaveLength(2);
    expect(r.meta).toEqual({ nextCursor: 'l2', hasMore: true, limit: 2, total: 9 });
  });

  it('passes the cursor through and skips the cursor row; last page has no nextCursor', async () => {
    mocks.prisma.loan.findMany.mockResolvedValue([]);
    mocks.prisma.loan.count.mockResolvedValue(3);

    const r = await getOverdue({ cursor: 'abc', limit: 100 });

    const call = mocks.prisma.loan.findMany.mock.calls[0][0];
    expect(call.cursor).toEqual({ id: 'abc' });
    expect(call.skip).toBe(1);
    expect(r.meta).toEqual({ nextCursor: null, hasMore: false, limit: 100, total: 3 });
  });

  it('computes days-past-due from the earliest overdue installment and sorts worst-first', async () => {
    mocks.prisma.loan.count.mockResolvedValue(2);
    mocks.prisma.loan.findMany.mockResolvedValue([
      {
        id: 'loan-a',
        amount: new Decimal(1000),
        remainingBalance: new Decimal(800),
        type: 'PERSONAL',
        disbursedAt: new Date('2025-12-01'),
        borrower: { id: 'b1', firstName: 'Ana', middleName: null, lastName: 'Cruz', email: 'a@x.ph', phone: '1' },
        loanInstallments: [{ dueDate: new Date('2026-01-22') }], // 10 days past 2026-02-01
      },
      {
        id: 'loan-b',
        amount: new Decimal(2000),
        remainingBalance: new Decimal(2000),
        type: 'BUSINESS',
        disbursedAt: new Date('2025-11-01'),
        borrower: { id: 'b2', firstName: 'Ben', middleName: 'Reyes', lastName: 'Dizon', email: 'b@x.ph', phone: '2' },
        loanInstallments: [{ dueDate: new Date('2026-01-02') }], // 30 days past
      },
    ]);

    const r = await getOverdue({ limit: 100 });

    expect(r.meta).toEqual({ nextCursor: null, hasMore: false, limit: 100, total: 2 });
    // Sorted DPD descending: loan-b (30) before loan-a (10).
    expect(r.data.map((d) => d.loanId)).toEqual(['loan-b', 'loan-a']);
    expect(r.data[0].daysPastDue).toBe(30);
    expect(r.data[1].daysPastDue).toBe(10);
    // Borrower name formatting: "Last, First Middle".
    expect(r.data[0].borrower.name).toBe('Dizon, Ben Reyes');
    expect(r.data[1].borrower.name).toBe('Cruz, Ana');
    expect(r.data[1].remainingBalance).toBe('800.00');
  });

  it('never reports negative days-past-due for a future-dated installment', async () => {
    mocks.prisma.loan.count.mockResolvedValue(1);
    mocks.prisma.loan.findMany.mockResolvedValue([
      {
        id: 'loan-c',
        amount: new Decimal(500),
        remainingBalance: new Decimal(500),
        type: 'PERSONAL',
        disbursedAt: new Date('2026-01-01'),
        borrower: { id: 'b3', firstName: 'Cy', middleName: null, lastName: 'Uy', email: 'c@x.ph', phone: '3' },
        loanInstallments: [{ dueDate: new Date('2026-03-01') }], // future
      },
    ]);

    const r = await getOverdue({ limit: 100 });
    expect(r.data[0].daysPastDue).toBe(0);
  });
});

// ── getPortfolioAtRisk: at-risk balance + PAR ratio ───────────────────────────

describe('reports.service getPortfolioAtRisk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes PAR ratio as at-risk balance over total outstanding balance', async () => {
    mocks.prisma.loan.aggregate.mockResolvedValue({
      _count: 4,
      _sum: { remainingBalance: new Decimal(10_000) },
    });
    mocks.prisma.loan.findMany.mockResolvedValue([
      { remainingBalance: new Decimal(1000) },
      { remainingBalance: new Decimal(250) },
    ]);

    const r = await getPortfolioAtRisk();

    expect(r).toEqual({
      totalPortfolioBalance: '10000.00',
      totalPortfolioCount: 4,
      atRiskBalance: '1250.00',
      atRiskCount: 2,
      parRatio: '12.50', // 1250 / 10000 = 12.50%
    });
  });

  it('returns a 0.00 PAR ratio (no divide-by-zero) when the portfolio is empty', async () => {
    mocks.prisma.loan.aggregate.mockResolvedValue({ _count: 0, _sum: { remainingBalance: null } });
    mocks.prisma.loan.findMany.mockResolvedValue([]);

    const r = await getPortfolioAtRisk();

    expect(r.parRatio).toBe('0.00');
    expect(r.atRiskBalance).toBe('0.00');
  });

  it('scopes both queries to outstanding, non-deleted loans', async () => {
    mocks.prisma.loan.aggregate.mockResolvedValue({ _count: 0, _sum: { remainingBalance: null } });
    mocks.prisma.loan.findMany.mockResolvedValue([]);

    await getPortfolioAtRisk();

    expect(mocks.prisma.loan.aggregate.mock.calls[0][0].where).toMatchObject({
      status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] },
      deletedAt: null,
    });
    expect(mocks.prisma.loan.findMany.mock.calls[0][0].where).toMatchObject({
      status: { in: ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'] },
      deletedAt: null,
      loanInstallments: { some: { status: 'OVERDUE' } },
    });
  });
});

// ── BSP-aligned provision buckets (resolveProvisionBucket) ────────────────────
// reports.service delegates bucketing to lending.ts; the PAR-bucket + provision
// rule lives there, so it is tested at its source. Boundaries are inclusive
// (dpd <= maxDpd), provision amount = balance * rate.

describe('lending resolveProvisionBucket (BSP provision buckets)', () => {
  it.each([
    [0, 1, 0.01], // current-but-flagged → Pass
    [30, 1, 0.01], // upper edge of Pass
    [31, 2, 0.05], // Special Mention
    [90, 2, 0.05],
    [91, 3, 0.25], // Substandard
    [180, 3, 0.25],
    [181, 4, 0.5], // Doubtful
    [365, 4, 0.5],
    [366, 5, 1.0], // Loss
    [10_000, 5, 1.0],
  ])('dpd=%i → bucket %i @ rate %f', (dpd, bucket, rate) => {
    expect(resolveProvisionBucket(dpd)).toEqual({ bucket, rate });
  });

  it('provision amount = outstanding balance * bucket rate', () => {
    const balance = new Decimal(10_000);
    // 120 DPD → Substandard (bucket 3, 25%) → ₱2,500 provision.
    const { rate } = resolveProvisionBucket(120);
    expect(balance.times(rate).toFixed(2)).toBe('2500.00');
  });
});
