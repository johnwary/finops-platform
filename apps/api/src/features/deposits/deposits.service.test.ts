import { Decimal } from '@prisma/client/runtime/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    deposit: { update: vi.fn() },
    depositPayout: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    capitalEntry: { create: vi.fn(), updateMany: vi.fn() },
    activityLog: { create: vi.fn() },
  };
  return {
    tx,
    prisma: {
      $transaction: vi.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
    },
  };
});

vi.mock('../../lib/prisma', () => ({ prisma: mocks.prisma }));

import { closeDeposit, recordPayout, reversePayout, withdrawDeposit } from './deposits.service.js';
import { recordPayoutSchema } from './deposits.schema.js';

const actor = { id: 'user-1' };

const activeDeposit = {
  id: 'dep-1',
  depositorId: 'depositor-1',
  status: 'ACTIVE',
  deletedAt: null,
  amount: new Decimal(100_000),
  totalPayoutPaid: new Decimal(0),
  principalReturned: new Decimal(0),
  notes: null,
};

describe('recordPayout locked recheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.depositPayout.create.mockResolvedValue({ id: 'payout-1' });
    mocks.tx.capitalEntry.updateMany.mockResolvedValue({ count: 1 });
  });

  it('rejects a payout when the locked deposit is no longer ACTIVE', async () => {
    // Deposit was closed by a concurrent request between scan and transaction.
    mocks.tx.$queryRaw.mockResolvedValue([
      { id: 'dep-1', status: 'CLOSED', deletedAt: null, totalPayoutPaid: new Decimal(0), principalReturned: new Decimal(0) },
    ]);

    await expect(
      recordPayout('dep-1', { amount: 100, principalPortion: 60, returnPortion: 40, method: 'CASH' }, actor),
    ).rejects.toMatchObject({ status: 409 });

    expect(mocks.tx.depositPayout.create).not.toHaveBeenCalled();
  });

  it('accumulates totals from the locked row', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([
      { id: 'dep-1', status: 'ACTIVE', deletedAt: null, amount: new Decimal(100_000), totalPayoutPaid: new Decimal(100), principalReturned: new Decimal(50) },
    ]);

    await recordPayout('dep-1', { amount: 100, principalPortion: 60, returnPortion: 40, method: 'CASH' }, actor);

    expect(mocks.tx.deposit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalPayoutPaid: new Decimal(200),
          principalReturned: new Decimal(110),
        }),
      }),
    );
  });
});

describe('recordPayout principal cap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.depositPayout.create.mockResolvedValue({ id: 'payout-1' });
  });

  it('rejects a payout whose cumulative principal exceeds the deposit amount', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([
      { ...activeDeposit, principalReturned: new Decimal(99_950) },
    ]);

    await expect(
      recordPayout('dep-1', { amount: 100, principalPortion: 100, returnPortion: 0, method: 'CASH' }, actor),
    ).rejects.toMatchObject({ code: 'PAYOUT_EXCEEDS_PRINCIPAL', status: 409 });

    expect(mocks.tx.depositPayout.create).not.toHaveBeenCalled();
  });
});

describe('recordPayout maturity-only gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.depositPayout.create.mockResolvedValue({ id: 'payout-1' });
  });

  it('rejects an interim payout on a MATURITY_ONLY deposit before its end date', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([
      { ...activeDeposit, payoutType: 'MATURITY_ONLY', endDate: new Date('2099-01-01') },
    ]);

    await expect(
      recordPayout('dep-1', { amount: 100, principalPortion: 0, returnPortion: 100, method: 'CASH' }, actor),
    ).rejects.toMatchObject({ code: 'DEPOSIT_PAYOUT_BEFORE_MATURITY', status: 409 });

    expect(mocks.tx.depositPayout.create).not.toHaveBeenCalled();
  });

  it('allows a MATURITY_ONLY payout once paidAt reaches the end date', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([
      { ...activeDeposit, payoutType: 'MATURITY_ONLY', endDate: new Date('2020-01-01') },
    ]);

    await recordPayout(
      'dep-1',
      { amount: 100, principalPortion: 0, returnPortion: 100, method: 'CASH', paidAt: new Date('2020-06-01') },
      actor,
    );

    expect(mocks.tx.depositPayout.create).toHaveBeenCalled();
  });

  it('does not gate non-MATURITY_ONLY payout types', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([
      { ...activeDeposit, payoutType: 'MONTHLY_INTEREST', endDate: new Date('2099-01-01') },
    ]);

    await recordPayout('dep-1', { amount: 100, principalPortion: 0, returnPortion: 100, method: 'CASH' }, actor);

    expect(mocks.tx.depositPayout.create).toHaveBeenCalled();
  });
});

describe('deposit termination principal outflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.deposit.update.mockResolvedValue({});
    mocks.tx.capitalEntry.updateMany.mockResolvedValue({ count: 1 });
  });

  it('close only outflows the principal not yet returned via payouts', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([
      { ...activeDeposit, principalReturned: new Decimal(40_000) },
    ]);

    await closeDeposit('dep-1', {}, actor);

    expect(mocks.tx.capitalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          flowType: 'OUTFLOW',
          source: 'DEPOSIT_WITHDRAWAL',
          amount: new Decimal(60_000),
        }),
      }),
    );
    // Column keeps payout-only semantics: termination must NOT clobber it to the
    // full amount, or the frontend's returnEarned goes negative.
    expect(mocks.tx.deposit.update.mock.calls[0][0].data).not.toHaveProperty('principalReturned');
  });

  it('withdraw skips the capital entry when principal was fully returned already', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([
      { ...activeDeposit, principalReturned: new Decimal(100_000) },
    ]);

    await withdrawDeposit('dep-1', {}, actor);

    expect(mocks.tx.capitalEntry.create).not.toHaveBeenCalled();
    expect(mocks.tx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'DEPOSIT_WITHDRAWN' }) }),
    );
  });
});

describe('reversePayout', () => {
  const payout = {
    id: 'payout-1',
    depositId: 'dep-1',
    amount: new Decimal(1000),
    principalPortion: new Decimal(600),
    reversedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.$queryRaw.mockResolvedValue([
      { ...activeDeposit, totalPayoutPaid: new Decimal(1000), principalReturned: new Decimal(600) },
    ]);
    mocks.tx.depositPayout.findFirst
      .mockResolvedValueOnce(payout)
      .mockResolvedValueOnce(payout);
    mocks.tx.depositPayout.update.mockResolvedValue({ ...payout, reversedAt: new Date() });
    mocks.tx.capitalEntry.updateMany.mockResolvedValue({ count: 1 });
  });

  it('unwinds deposit totals and marks payout + capital entry reversed', async () => {
    await reversePayout('dep-1', 'payout-1', { reason: 'Typo' }, actor);

    expect(mocks.tx.deposit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalPayoutPaid: new Decimal(0),
          principalReturned: new Decimal(0),
        }),
      }),
    );
    expect(mocks.tx.capitalEntry.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ source: 'DEPOSIT_PAYOUT', sourceId: 'payout-1' }),
      }),
    );
  });

  it('rejects a payout that is not the most recent', async () => {
    mocks.tx.depositPayout.findFirst
      .mockReset()
      .mockResolvedValueOnce(payout)
      .mockResolvedValueOnce({ ...payout, id: 'payout-2' });

    await expect(
      reversePayout('dep-1', 'payout-1', { reason: 'Typo' }, actor),
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });

    expect(mocks.tx.deposit.update).not.toHaveBeenCalled();
  });

  it('uses recording order for LIFO because paidAt can be backdated', async () => {
    await reversePayout('dep-1', 'payout-1', { reason: 'Typo' }, actor);

    expect(mocks.tx.depositPayout.findFirst).toHaveBeenLastCalledWith({
      where: { depositId: 'dep-1', reversedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('rejects a reversal without exactly one capital entry', async () => {
    mocks.tx.capitalEntry.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      reversePayout('dep-1', 'payout-1', { reason: 'Typo' }, actor),
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
  });
});

describe('recordPayoutSchema sum check', () => {
  const base = { method: 'CASH' as const };

  it('accepts when principal + return equals amount', () => {
    expect(recordPayoutSchema.safeParse({ ...base, amount: 100, principalPortion: 60, returnPortion: 40 }).success).toBe(true);
  });

  it('rejects when the portions do not sum to the amount', () => {
    expect(recordPayoutSchema.safeParse({ ...base, amount: 100, principalPortion: 60, returnPortion: 30 }).success).toBe(false);
  });

  it('rejects an amount over the sanity ceiling', () => {
    expect(recordPayoutSchema.safeParse({ ...base, amount: 100_000_001, principalPortion: 100_000_001, returnPortion: 0 }).success).toBe(false);
  });

  it('rejects fractions of a cent and future payout dates', () => {
    expect(recordPayoutSchema.safeParse({ ...base, amount: 100.001, principalPortion: 100.001, returnPortion: 0 }).success).toBe(false);
    expect(recordPayoutSchema.safeParse({ ...base, amount: 100, principalPortion: 100, returnPortion: 0, paidAt: new Date(Date.now() + 60_000) }).success).toBe(false);
  });
});
