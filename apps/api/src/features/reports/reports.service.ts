import { Decimal } from '@prisma/client/runtime/client';
import { startOfDay, startOfWeek, startOfMonth, startOfQuarter, startOfYear } from 'date-fns';
import { prisma } from '../../lib/prisma.js';
import type { PeriodInput } from './reports.schema.js';

function periodStart(period: PeriodInput['period']): Date {
  const now = new Date();
  switch (period) {
    case 'today':   return startOfDay(now);
    case 'week':    return startOfWeek(now, { weekStartsOn: 1 });
    case 'month':   return startOfMonth(now);
    case 'quarter': return startOfQuarter(now);
    case 'year':    return startOfYear(now);
  }
}

function sumDecimals(rows: { _sum: { [k: string]: Decimal | null } }, key: string): string {
  const val = (rows._sum as Record<string, Decimal | null>)[key];
  return (val ?? new Decimal(0)).toFixed(2);
}

function formatBorrowerName(b: { firstName: string; middleName?: string | null; lastName: string }): string {
  const first = b.middleName ? `${b.firstName} ${b.middleName}` : b.firstName;
  return `${b.lastName}, ${first}`;
}

export async function getSummary(input: PeriodInput) {
  const since = periodStart(input.period);

  const [
    // Borrowers
    activeBorrowers,
    newBorrowers,

    // Loans by status
    loanCounts,
    loanAmounts,

    // Active loan portfolio
    activeLoanPortfolio,

    // Collections in period
    periodCollections,

    // Deposits by status
    depositCounts,
    depositAmounts,

    // Active deposits total
    activeDeposits,

    // Capital: inflows/outflows all-time
    capitalInflow,
    capitalOutflow,

    // Capital: inflows/outflows in period
    periodInflow,
    periodOutflow,

    // New loans disbursed in period
    periodDisbursements,

    // Deposits maturing this month (endDate within current month)
    maturingDeposits,
  ] = await Promise.all([
    // Active borrowers
    prisma.borrower.count({ where: { deletedAt: null } }),

    // New borrowers in period
    prisma.borrower.count({ where: { deletedAt: null, createdAt: { gte: since } } }),

    // Loan counts by status
    prisma.loan.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: true,
    }),

    // Loan amounts by status
    prisma.loan.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _sum: { amount: true, remainingBalance: true, totalPaid: true },
    }),

    // Active loan portfolio totals
    prisma.loan.aggregate({
      where: { status: 'ACTIVE', deletedAt: null },
      _sum: { amount: true, remainingBalance: true, totalPaid: true },
      _count: true,
    }),

    // Collections (payments) in period
    prisma.loanPayment.aggregate({
      where: { paidAt: { gte: since } },
      _sum: { amount: true, principalPortion: true, interestPortion: true },
      _count: true,
    }),

    // Deposit counts by status
    prisma.deposit.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: true,
    }),

    // Deposit amounts by status
    prisma.deposit.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _sum: { amount: true, totalPayoutPaid: true },
    }),

    // Active deposits total
    prisma.deposit.aggregate({
      where: { status: 'ACTIVE', deletedAt: null },
      _sum: { amount: true, totalPayoutPaid: true },
      _count: true,
    }),

    // All-time capital inflow
    prisma.capitalEntry.aggregate({
      where: { flowType: 'INFLOW', reversedAt: null },
      _sum: { amount: true },
    }),

    // All-time capital outflow
    prisma.capitalEntry.aggregate({
      where: { flowType: 'OUTFLOW', reversedAt: null },
      _sum: { amount: true },
    }),

    // Period capital inflow
    prisma.capitalEntry.aggregate({
      where: { flowType: 'INFLOW', reversedAt: null, recordedAt: { gte: since } },
      _sum: { amount: true },
    }),

    // Period capital outflow
    prisma.capitalEntry.aggregate({
      where: { flowType: 'OUTFLOW', reversedAt: null, recordedAt: { gte: since } },
      _sum: { amount: true },
    }),

    // Loans disbursed in period
    prisma.loan.aggregate({
      where: { status: { in: ['ACTIVE', 'PAID', 'DEFAULTED'] }, disbursedAt: { gte: since }, deletedAt: null },
      _sum: { amount: true },
      _count: true,
    }),

    // Deposits maturing in current month
    prisma.deposit.count({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        endDate: { gte: startOfMonth(new Date()), lte: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0) },
      },
    }),
  ]);

  // Build loan summary map
  const loanCountMap = Object.fromEntries(loanCounts.map((r) => [r.status, r._count]));
  const loanAmountMap = Object.fromEntries(
    loanAmounts.map((r) => [
      r.status,
      {
        amount: (r._sum.amount ?? new Decimal(0)).toFixed(2),
        remainingBalance: (r._sum.remainingBalance ?? new Decimal(0)).toFixed(2),
        totalPaid: (r._sum.totalPaid ?? new Decimal(0)).toFixed(2),
      },
    ]),
  );

  const depositCountMap = Object.fromEntries(depositCounts.map((r) => [r.status, r._count]));
  const depositAmountMap = Object.fromEntries(
    depositAmounts.map((r) => [
      r.status,
      {
        amount: (r._sum.amount ?? new Decimal(0)).toFixed(2),
        totalPayoutPaid: (r._sum.totalPayoutPaid ?? new Decimal(0)).toFixed(2),
      },
    ]),
  );

  const totalInflow = capitalInflow._sum.amount ?? new Decimal(0);
  const totalOutflow = capitalOutflow._sum.amount ?? new Decimal(0);
  const netCapital = totalInflow.minus(totalOutflow);

  return {
    period: input.period,
    periodSince: since,

    borrowers: {
      total: activeBorrowers,
      newInPeriod: newBorrowers,
    },

    loans: {
      byStatus: {
        pending:   { count: loanCountMap['PENDING']   ?? 0, ...loanAmountMap['PENDING']   ?? { amount: '0.00', remainingBalance: '0.00', totalPaid: '0.00' } },
        approved:  { count: loanCountMap['APPROVED']  ?? 0, ...loanAmountMap['APPROVED']  ?? { amount: '0.00', remainingBalance: '0.00', totalPaid: '0.00' } },
        active:    { count: loanCountMap['ACTIVE']    ?? 0, ...loanAmountMap['ACTIVE']    ?? { amount: '0.00', remainingBalance: '0.00', totalPaid: '0.00' } },
        paid:      { count: loanCountMap['PAID']      ?? 0, ...loanAmountMap['PAID']      ?? { amount: '0.00', remainingBalance: '0.00', totalPaid: '0.00' } },
        defaulted: { count: loanCountMap['DEFAULTED'] ?? 0, ...loanAmountMap['DEFAULTED'] ?? { amount: '0.00', remainingBalance: '0.00', totalPaid: '0.00' } },
        canceled:  { count: loanCountMap['CANCELED']  ?? 0, ...loanAmountMap['CANCELED']  ?? { amount: '0.00', remainingBalance: '0.00', totalPaid: '0.00' } },
      },
      activePortfolio: {
        count: activeLoanPortfolio._count,
        totalDisbursed: (activeLoanPortfolio._sum.amount ?? new Decimal(0)).toFixed(2),
        totalRemaining: (activeLoanPortfolio._sum.remainingBalance ?? new Decimal(0)).toFixed(2),
        totalCollected: (activeLoanPortfolio._sum.totalPaid ?? new Decimal(0)).toFixed(2),
      },
      periodDisbursements: {
        count: periodDisbursements._count,
        amount: (periodDisbursements._sum.amount ?? new Decimal(0)).toFixed(2),
      },
    },

    collections: {
      inPeriod: {
        count: periodCollections._count,
        amount: (periodCollections._sum.amount ?? new Decimal(0)).toFixed(2),
        principalPortion: (periodCollections._sum.principalPortion ?? new Decimal(0)).toFixed(2),
        interestPortion: (periodCollections._sum.interestPortion ?? new Decimal(0)).toFixed(2),
      },
    },

    deposits: {
      byStatus: {
        active:    { count: depositCountMap['ACTIVE']    ?? 0, ...depositAmountMap['ACTIVE']    ?? { amount: '0.00', totalPayoutPaid: '0.00' } },
        withdrawn: { count: depositCountMap['WITHDRAWN'] ?? 0, ...depositAmountMap['WITHDRAWN'] ?? { amount: '0.00', totalPayoutPaid: '0.00' } },
        closed:    { count: depositCountMap['CLOSED']    ?? 0, ...depositAmountMap['CLOSED']    ?? { amount: '0.00', totalPayoutPaid: '0.00' } },
      },
      activePortfolio: {
        count: activeDeposits._count,
        totalAmount: (activeDeposits._sum.amount ?? new Decimal(0)).toFixed(2),
        totalPayoutPaid: (activeDeposits._sum.totalPayoutPaid ?? new Decimal(0)).toFixed(2),
      },
      maturingThisMonth: maturingDeposits,
    },

    capital: {
      allTime: {
        totalInflow: totalInflow.toFixed(2),
        totalOutflow: totalOutflow.toFixed(2),
        netCapital: netCapital.toFixed(2),
      },
      inPeriod: {
        inflow: (periodInflow._sum.amount ?? new Decimal(0)).toFixed(2),
        outflow: (periodOutflow._sum.amount ?? new Decimal(0)).toFixed(2),
        net: ((periodInflow._sum.amount ?? new Decimal(0)).minus(periodOutflow._sum.amount ?? new Decimal(0))).toFixed(2),
      },
    },
  };
}

export async function getOverdue() {
  const loans = await prisma.loan.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      loanInstallments: { some: { status: 'OVERDUE' } },
    },
    include: {
      borrower: {
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      loanInstallments: {
        where: { status: 'OVERDUE' },
        orderBy: { dueDate: 'asc' },
        take: 1,
      },
    },
    orderBy: { disbursedAt: 'asc' },
  });

  const now = new Date();

  const data = loans.map((loan) => {
    const earliest = loan.loanInstallments[0];
    const dpd = earliest
      ? Math.max(0, Math.floor((now.getTime() - earliest.dueDate.getTime()) / 86_400_000))
      : 0;

    return {
      loanId: loan.id,
      borrower: {
        id: loan.borrower.id,
        name: formatBorrowerName(loan.borrower),
        email: loan.borrower.email,
        phone: loan.borrower.phone,
      },
      amount: loan.amount.toFixed(2),
      remainingBalance: loan.remainingBalance.toFixed(2),
      earliestOverdueDueDate: earliest?.dueDate ?? null,
      daysPastDue: dpd,
      type: loan.type,
      disbursedAt: loan.disbursedAt,
    };
  });

  // Sort by DPD descending — worst first
  data.sort((a, b) => b.daysPastDue - a.daysPastDue);

  return { data, meta: { total: data.length } };
}

export async function getPortfolioAtRisk() {
  const [activePortfolio, atRiskPortfolio] = await Promise.all([
    // Total outstanding balance of all ACTIVE loans
    prisma.loan.aggregate({
      where: { status: 'ACTIVE', deletedAt: null },
      _sum: { remainingBalance: true },
      _count: true,
    }),

    // Outstanding balance of ACTIVE loans with at least one OVERDUE installment
    prisma.loan.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        loanInstallments: { some: { status: 'OVERDUE' } },
      },
      select: { remainingBalance: true },
    }),
  ]);

  const totalPortfolio = activePortfolio._sum.remainingBalance ?? new Decimal(0);
  const atRiskBalance = atRiskPortfolio.reduce(
    (sum, l) => sum.plus(l.remainingBalance),
    new Decimal(0),
  );

  const parRatio =
    totalPortfolio.greaterThan(0)
      ? atRiskBalance.dividedBy(totalPortfolio).times(100).toDecimalPlaces(2)
      : new Decimal(0);

  return {
    totalPortfolioBalance: totalPortfolio.toFixed(2),
    totalPortfolioCount: activePortfolio._count,
    atRiskBalance: atRiskBalance.toFixed(2),
    atRiskCount: atRiskPortfolio.length,
    parRatio: parRatio.toFixed(2), // percentage e.g. "12.50"
  };
}
