import { Decimal } from '@prisma/client/runtime/client';
import { addMonths, addWeeks, addDays, differenceInDays } from 'date-fns';
import { prisma } from '../../lib/prisma.js';
import type { Loan, Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/response.js';
import { resolveProvisionBucket } from '../../lib/lending.js';
import { isUniqueViolation } from '../../lib/prisma-error.js';
import { normalizePhone } from '../../lib/phone.js';
import { recordLoanPayment, reverseLoanPayment } from './loan-payments.service.js';
import type {
  RestructureLoanInput,
  CreateLoanInput,
  ApproveLoanInput,
  DisburseLoanInput,
  CancelLoanInput,
  RecordPaymentInput,
  ReversePaymentInput,
  LockLoanInput,
  DefaultLoanInput,
  MarkArrearsInput,
  MarkCurrentInput,
  WriteOffLoanInput,
  ListLoansInput,
  ListLoanActivityInput,
} from './loans.schema.js';

interface Actor {
  id: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function toDecimal(value: number | null | undefined): Decimal | undefined {
  return value != null ? new Decimal(value) : undefined;
}

async function lockedLoan(
  tx: Prisma.TransactionClient,
  id: string,
  deleted: 'active' | 'deleted' | 'any' = 'active',
): Promise<Loan> {
  const rows = await tx.$queryRaw<Loan[]>`
    SELECT *
    FROM "Loan"
    WHERE id = ${id}
    FOR UPDATE
  `;
  const loan = rows[0];
  const isMissing =
    !loan ||
    (deleted === 'active' && loan.deletedAt != null) ||
    (deleted === 'deleted' && loan.deletedAt == null);

  if (isMissing) {
    throw new AppError('NOT_FOUND', deleted === 'deleted' ? 'Deleted loan not found.' : 'Loan not found.', 404);
  }

  return loan;
}

function assertLoanStatus(loan: Loan, allowed: readonly Loan['status'][], message: string) {
  if (!allowed.includes(loan.status)) {
    throw new AppError('LOAN_INVALID_STATE', message, 409);
  }
}

function installmentDueDate(start: Date, frequency: string, seq: number): Date {
  switch (frequency) {
    case 'BIWEEKLY':
      return addWeeks(start, seq * 2);
    case 'WEEKLY':
      return addWeeks(start, seq);
    case 'DAILY':
      return addDays(start, seq);
    default: // MONTHLY
      return addMonths(start, seq);
  }
}

/** Number of installments based on frequency and term in months */
function legacyInstallmentCount(termMonths: number, frequency: string): number {
  switch (frequency) {
    case 'BIWEEKLY':
      return Math.round((termMonths * 4) / 2); // ~2 per month
    case 'WEEKLY':
      return termMonths * 4;
    case 'DAILY':
      return termMonths * 30;
    default: // MONTHLY
      return termMonths;
  }
}

function isLastDayOfFebruary(date: Date): boolean {
  if (date.getUTCMonth() !== 1) return false;
  return date.getUTCDate() === new Date(Date.UTC(date.getUTCFullYear(), 2, 0)).getUTCDate();
}

// 30/360 US: the contractual monthly rate accrues over thirty-day months.
function thirty360Days(start: Date, end: Date): number {
  let startDay = start.getUTCDate();
  let endDay = end.getUTCDate();

  if (isLastDayOfFebruary(start) || startDay === 31) startDay = 30;
  if ((isLastDayOfFebruary(end) && isLastDayOfFebruary(start)) || (endDay === 31 && startDay === 30)) {
    endDay = 30;
  }

  return (
    (end.getUTCFullYear() - start.getUTCFullYear()) * 360 +
    (end.getUTCMonth() - start.getUTCMonth()) * 30 +
    endDay - startDay
  );
}

function thirty360ScheduleDates(start: Date, termMonths: number, frequency: string) {
  const maturityDate = addMonths(start, termMonths);
  const dates: Array<{ dueDate: Date; accrualDays: number }> = [];
  let previousDueDate = start;

  for (let sequence = 1; ; sequence++) {
    const scheduledDueDate = installmentDueDate(start, frequency, sequence);
    const dueDate = scheduledDueDate >= maturityDate ? maturityDate : scheduledDueDate;
    dates.push({ dueDate, accrualDays: thirty360Days(previousDueDate, dueDate) });
    if (dueDate.getTime() === maturityDate.getTime()) break;
    previousDueDate = dueDate;
  }

  return dates;
}

/** Amortizing: equal P+I per period. Interest-only: flat interest, principal lump at end. */
function buildInstallments(
  loanId: string,
  principal: number,
  monthlyRate: number,
  termMonths: number,
  frequency: string,
  repaymentStructure: string,
  startDate: Date,
  accrualConvention: Loan['accrualConvention'],
): Array<{
  loanId: string;
  sequence: number;
  dueDate: Date;
  principal: Decimal;
  interest: Decimal;
}> {
  const thirty360Dates = accrualConvention === 'THIRTY_360'
    ? thirty360ScheduleDates(startDate, termMonths, frequency)
    : null;
  const count = thirty360Dates?.length ?? legacyInstallmentCount(termMonths, frequency);

  // Adjust rate for sub-monthly frequencies (simple proportional)
  let periodRate: number;
  switch (frequency) {
    case 'BIWEEKLY':
      periodRate = (monthlyRate * 12) / 26;
      break;
    case 'WEEKLY':
      periodRate = (monthlyRate * 12) / 52;
      break;
    case 'DAILY':
      periodRate = (monthlyRate * 12) / 365;
      break;
    default:
      periodRate = monthlyRate;
  }

  const periodRates = thirty360Dates
    ? thirty360Dates.map(({ accrualDays }) => (monthlyRate * accrualDays) / 30)
    : Array.from({ length: count }, () => periodRate);
  const installments = [];
  const rawPrincipalAmounts: Decimal[] = [];

  if (repaymentStructure === 'INTEREST_ONLY') {
    for (let i = 1; i <= count; i++) {
      const isLast = i === count;
      installments.push({
        loanId,
        sequence: i,
        dueDate: thirty360Dates?.[i - 1]!.dueDate ?? installmentDueDate(startDate, frequency, i),
        principal: new Decimal(isLast ? principal : 0).toDecimalPlaces(2),
        interest: new Decimal(principal * periodRates[i - 1]!).toDecimalPlaces(2),
      });
    }
  } else {
    // Amortizing: solve one payment across the schedule's actual period rates.
    let balance = principal;
    let discount = 1;
    let annuityFactor = 0;
    for (const rate of periodRates) {
      discount *= 1 + rate;
      annuityFactor += 1 / discount;
    }
    const pmt = principal / annuityFactor;

    for (let i = 1; i <= count; i++) {
      const interestDue = balance * periodRates[i - 1]!;
      const principalDue = Math.min(pmt - interestDue, balance);
      balance -= principalDue;
      const rawPrincipal = new Decimal(principalDue);
      rawPrincipalAmounts.push(rawPrincipal);

      installments.push({
        loanId,
        sequence: i,
        dueDate: thirty360Dates?.[i - 1]!.dueDate ?? installmentDueDate(startDate, frequency, i),
        principal: rawPrincipal.toDecimalPlaces(2),
        interest: new Decimal(interestDue).toDecimalPlaces(2),
      });
    }

    const expectedPrincipal = new Decimal(principal).toDecimalPlaces(2);
    const scheduledPrincipal = installments.reduce(
      (sum, installment) => sum.plus(installment.principal),
      new Decimal(0),
    );
    const roundingDelta = expectedPrincipal.minus(scheduledPrincipal);
    const last = installments[installments.length - 1]!;
    const adjustedLast = last.principal.plus(roundingDelta).toDecimalPlaces(2);

    if (adjustedLast.greaterThanOrEqualTo(0)) {
      last.principal = adjustedLast;
    } else {
      // Cent rounding overshot the principal. Round cumulative principal and
      // derive each installment from the prior rounded total instead.
      let rawCumulative = new Decimal(0);
      let allocatedPrincipal = new Decimal(0);

      for (const [index, installment] of installments.entries()) {
        if (index === installments.length - 1) {
          installment.principal = expectedPrincipal.minus(allocatedPrincipal);
          break;
        }

        rawCumulative = rawCumulative.plus(rawPrincipalAmounts[index]!);
        const roundedCumulative = rawCumulative.toDecimalPlaces(2);
        const cappedCumulative = roundedCumulative.greaterThan(expectedPrincipal)
          ? expectedPrincipal
          : roundedCumulative;
        installment.principal = cappedCumulative.minus(allocatedPrincipal);
        allocatedPrincipal = cappedCumulative;
      }
    }
  }

  return installments;
}

// ── service functions ─────────────────────────────────────────────────────────

export async function createLoan(data: CreateLoanInput, actor: Actor) {
  const borrower = await prisma.borrower.findFirst({
    where: { id: data.borrowerId, deletedAt: null },
  });
  if (!borrower) throw new AppError('NOT_FOUND', 'Borrower not found.', 404);

  try {
    return await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: {
          borrowerId: data.borrowerId,
          type: data.type,
          amount: new Decimal(data.amount),
          interestRate: new Decimal(data.interestRate),
          accrualConvention: 'THIRTY_360',
          termMonths: data.termMonths,
          applicationDate: data.applicationDate,
          paymentFrequency: data.paymentFrequency,
          repaymentStructure: data.repaymentStructure,
          remainingBalance: new Decimal(data.amount),
          loanFee: toDecimal(data.loanFee),
          penaltyRate: toDecimal(data.penaltyRate),
          purpose: data.purpose,
          notes: data.notes,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: actor.id,
          category: 'AUDIT',
          action: 'LOAN_CREATED',
          targetId: loan.id,
          metadata: {
            borrowerId: loan.borrowerId,
            amount: loan.amount,
            type: loan.type,
          },
        },
      });

      return loan;
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new AppError('CONFLICT', 'Loan conflict.', 409);
    }
    throw err;
  }
}

export async function getLoan(id: string) {
  const loan = await prisma.loan.findFirst({
    where: { id, deletedAt: null },
    include: {
      borrower: {
        select: { id: true, firstName: true, middleName: true, lastName: true, email: true, phone: true },
      },
      loanInstallments: {
        orderBy: { sequence: 'asc' },
        include: {
          allocations: {
            select: {
              principalApplied: true,
              interestApplied: true,
              penaltiesApplied: true,
            },
          },
        },
      },
      loanPayments: {
        orderBy: { paidAt: 'desc' },
      },
    },
  });

  if (!loan) throw new AppError('NOT_FOUND', 'Loan not found.', 404);
  return loan;
}

export async function listLoans({ cursor, limit, borrowerId, status, search, type, deleted }: ListLoansInput) {
  const where: Record<string, unknown> = { deletedAt: deleted ? { not: null } : null };

  if (borrowerId) where.borrowerId = borrowerId;
  if (status) where.status = status;
  if (type) where.type = type;
  if (search) {
    const normalizedPhone = normalizePhone(search);
    where.OR = [
      { borrower: { firstName: { contains: search, mode: 'insensitive' } } },
      { borrower: { middleName: { contains: search, mode: 'insensitive' } } },
      { borrower: { lastName: { contains: search, mode: 'insensitive' } } },
      { borrower: { email: { contains: search, mode: 'insensitive' } } },
      ...(normalizedPhone ? [{ borrower: { phoneNormalized: { contains: normalizedPhone } } }] : []),
    ];
  }

  const loans = await prisma.loan.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    take: limit + 1,
    include: {
      borrower: { select: { id: true, firstName: true, middleName: true, lastName: true, email: true } },
    },
  });

  const hasMore = loans.length > limit;
  const data = hasMore ? loans.slice(0, limit) : loans;
  const nextCursor = hasMore ? (data[data.length - 1]?.id ?? null) : null;

  return { data, meta: { nextCursor, hasMore, limit } };
}

export async function approveLoan(id: string, data: ApproveLoanInput, actor: Actor) {
  const approvedAt = data.approvedAt
    ? new Date(Date.UTC(data.approvedAt.getUTCFullYear(), data.approvedAt.getUTCMonth(), data.approvedAt.getUTCDate(), 4, 0, 0))
    : new Date();

  return prisma.$transaction(async (tx) => {
    const loan = await lockedLoan(tx, id);
    assertLoanStatus(loan, ['PENDING'], `Cannot approve a loan with status ${loan.status}.`);

    const updated = await tx.loan.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt,
        approvedById: actor.id,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'LOAN_APPROVED',
        targetId: id,
        metadata: { previousStatus: 'PENDING' },
      },
    });

    return updated;
  });
}

export async function disburseLoan(id: string, data: DisburseLoanInput, actor: Actor) {
  // Use noon Manila time (UTC+8 = UTC+480 min) to avoid UTC day-shift on date-only input
  const disbursedAt = data.disbursedAt
    ? new Date(Date.UTC(data.disbursedAt.getUTCFullYear(), data.disbursedAt.getUTCMonth(), data.disbursedAt.getUTCDate(), 4, 0, 0))
    : new Date();

  return prisma.$transaction(async (tx) => {
    const loan = await lockedLoan(tx, id);
    assertLoanStatus(loan, ['APPROVED'], `Cannot disburse a loan with status ${loan.status}.`);

    const installments = buildInstallments(
      id,
      Number(loan.amount),
      Number(loan.interestRate),
      loan.termMonths,
      loan.paymentFrequency,
      loan.repaymentStructure,
      disbursedAt,
      loan.accrualConvention,
    );
    // End date = final installment due date, so it tracks the actual schedule
    // for every payment frequency.
    const endDate = installments[installments.length - 1]!.dueDate;

    const updated = await tx.loan.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        disbursedAt,
        disbursedById: actor.id,
        disbursementMethod: data.disbursementMethod,
        endDate,
        notes: data.notes ?? loan.notes,
      },
    });

    await tx.loanInstallment.createMany({ data: installments });

    // Capital outflow: funds leave the business
    await tx.capitalEntry.create({
      data: {
        flowType: 'OUTFLOW',
        source: 'LOAN_DISBURSEMENT',
        sourceId: id,
        amount: loan.amount,
        description: `Loan disbursed to borrower ${loan.borrowerId}`,
        createdById: actor.id,
      },
    });

    // Optional upfront fee collected at disbursement — separate inflow so fee
    // income stays visible in the ledger instead of netting the disbursement.
    const feeCollected =
      data.collectFee && loan.loanFee && new Decimal(loan.loanFee).greaterThan(0)
        ? new Decimal(loan.loanFee)
        : null;
    if (feeCollected) {
      await tx.capitalEntry.create({
        data: {
          flowType: 'INFLOW',
          source: 'LOAN_FEE',
          sourceId: id,
          amount: feeCollected,
          description: `Loan fee collected on disbursement of loan ${id}`,
          createdById: actor.id,
        },
      });
    }

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'LOAN_DISBURSED',
        targetId: id,
        metadata: {
          method: data.disbursementMethod,
          installmentsGenerated: installments.length,
          feeCollected,
        },
      },
    });

    return updated;
  });
}

export async function cancelLoan(id: string, data: CancelLoanInput, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const loan = await lockedLoan(tx, id);
    assertLoanStatus(loan, ['PENDING', 'APPROVED'], `Cannot cancel a loan with status ${loan.status}.`);

    const updated = await tx.loan.update({
      where: { id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        canceledById: actor.id,
        cancellationReason: data.cancellationReason,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'LOAN_CANCELED',
        targetId: id,
        metadata: { reason: data.cancellationReason },
      },
    });

    return updated;
  });
}

export async function recordPayment(id: string, data: RecordPaymentInput, actor: Actor) {
  return recordLoanPayment(id, data, actor);
}

export async function reversePayment(
  loanId: string,
  paymentId: string,
  data: ReversePaymentInput,
  actor: Actor,
) {
  return reverseLoanPayment(loanId, paymentId, data, actor);
}
export async function lockLoan(id: string, data: LockLoanInput, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const loan = await lockedLoan(tx, id);
    if (loan.locked) throw new AppError('CONFLICT', 'Loan is already locked.', 409);

    const updated = await tx.loan.update({ where: { id }, data: { locked: true } });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'LOAN_LOCKED',
        targetId: id,
        metadata: { reason: data.reason ?? null },
      },
    });

    return updated;
  });
}

export async function unlockLoan(id: string, data: LockLoanInput, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const loan = await lockedLoan(tx, id);
    if (!loan.locked) throw new AppError('CONFLICT', 'Loan is not locked.', 409);

    const updated = await tx.loan.update({ where: { id }, data: { locked: false } });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'LOAN_UNLOCKED',
        targetId: id,
        metadata: { reason: data.reason ?? null },
      },
    });

    return updated;
  });
}

export async function defaultLoan(id: string, data: DefaultLoanInput, actor: Actor) {
  // Compute DPD outside transaction (read-only, safe to do before)
  let dpd = data.daysPastDue ?? 0;

  if (!data.daysPastDue) {
    const earliestOverdue = await prisma.loanInstallment.findFirst({
      where: { loanId: id, status: 'OVERDUE' },
      orderBy: { dueDate: 'asc' },
    });

    if (earliestOverdue) {
      dpd = differenceInDays(new Date(), earliestOverdue.dueDate);
    }
  }

  return prisma.$transaction(async (tx) => {
    const loan = await lockedLoan(tx, id);
    assertLoanStatus(loan, ['ACTIVE', 'IN_ARREARS'], `Cannot default a loan with status ${loan.status}.`);

    const { bucket, rate } = resolveProvisionBucket(dpd);
    const basisAmount = new Decimal(loan.remainingBalance);
    const provisionAmount = basisAmount.times(rate).toDecimalPlaces(2);

    const updated = await tx.loan.update({
      where: { id },
      data: { status: 'DEFAULTED', defaultedAt: new Date() },
    });

    await tx.loanProvisionEvent.create({
      data: {
        loanId: id,
        type: 'PROVISION',
        bucket,
        daysPastDue: dpd,
        basisAmount,
        provisionRate: new Decimal(rate),
        amount: provisionAmount,
        reason: data.reason ?? `Loan marked defaulted — DPD ${dpd}, bucket ${bucket}`,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'LOAN_DEFAULTED',
        targetId: id,
        metadata: {
          dpd,
          bucket,
          provisionRate: rate,
          provisionAmount,
          remainingBalance: loan.remainingBalance,
        },
      },
    });

    return updated;
  });
}

export async function softDeleteLoan(id: string, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const loan = await lockedLoan(tx, id);
    if (loan.status === 'ACTIVE' || loan.status === 'IN_ARREARS') {
      throw new AppError('LOAN_INVALID_STATE', 'Cannot delete an active loan.', 409);
    }

    const deleted = await tx.loan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'LOAN_DELETED',
        targetId: id,
        metadata: { status: loan.status },
      },
    });

    return deleted;
  });
}

export async function restoreLoan(id: string, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const loan = await lockedLoan(tx, id, 'deleted');

    const restored = await tx.loan.update({
      where: { id },
      data: { deletedAt: null },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'LOAN_RESTORED',
        targetId: id,
        metadata: { status: loan.status },
      },
    });

    return restored;
  });
}

export async function markLoanArrears(id: string, data: MarkArrearsInput, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const loan = await lockedLoan(tx, id);
    assertLoanStatus(loan, ['ACTIVE'], `Cannot mark a loan with status ${loan.status} as in arrears.`);

    const updated = await tx.loan.update({
      where: { id },
      data: { status: 'IN_ARREARS' },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'LOAN_MARKED_IN_ARREARS',
        targetId: id,
        metadata: { reason: data.reason ?? null },
      },
    });

    return updated;
  });
}

export async function markLoanCurrent(id: string, data: MarkCurrentInput, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const loan = await lockedLoan(tx, id);
    assertLoanStatus(loan, ['IN_ARREARS'], `Cannot mark a loan with status ${loan.status} as current.`);

    const overdueInstallment = await tx.loanInstallment.findFirst({
      where: { loanId: id, status: 'OVERDUE' },
      select: { id: true },
    });
    if (overdueInstallment) {
      throw new AppError('CONFLICT', 'Cannot mark a loan current while installments are overdue.', 409);
    }

    const updated = await tx.loan.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'LOAN_MARKED_CURRENT',
        targetId: id,
        metadata: { reason: data.reason ?? null },
      },
    });

    return updated;
  });
}

export async function writeOffLoan(id: string, data: WriteOffLoanInput, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const loan = await lockedLoan(tx, id);
    assertLoanStatus(loan, ['DEFAULTED'], `Cannot write off a loan with status ${loan.status}.`);

    const updated = await tx.loan.update({
      where: { id },
      data: { status: 'WRITTEN_OFF' },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'LOAN_WRITTEN_OFF',
        targetId: id,
        metadata: { reason: data.reason, remainingBalance: loan.remainingBalance },
      },
    });

    return updated;
  });
}

export async function listLoanActivity(
  id: string,
  { cursor, limit }: ListLoanActivityInput,
  actor: { role?: string | null },
) {
  const loanWhere = actor.role === 'admin' ? { id } : { id, deletedAt: null };

  const loan = await prisma.loan.findFirst({ where: loanWhere });
  if (!loan) throw new AppError('NOT_FOUND', 'Loan not found.', 404);

  const logs = await prisma.activityLog.findMany({
    where: { targetId: id },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    take: limit + 1,
    select: {
      id: true,
      action: true,
      category: true,
      metadata: true,
      createdAt: true,
      userId: true,
    },
  });

  const hasMore = logs.length > limit;
  const data = hasMore ? logs.slice(0, limit) : logs;
  const nextCursor = hasMore ? (data[data.length - 1]?.id ?? null) : null;

  return { data, meta: { nextCursor, hasMore, limit } };
}

export async function restructureLoan(id: string, data: RestructureLoanInput, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const loan = await lockedLoan(tx, id);
    assertLoanStatus(loan, ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'], `Cannot restructure a loan with status ${loan.status}.`);

    const newRate = data.interestRate !== undefined ? data.interestRate : Number(loan.interestRate);
    const newTerm = data.termMonths !== undefined ? data.termMonths : loan.termMonths;
    const newFrequency = data.paymentFrequency ?? loan.paymentFrequency;
    const newStructure = data.repaymentStructure ?? loan.repaymentStructure;

    if (
      newRate === Number(loan.interestRate) &&
      newTerm === loan.termMonths &&
      newFrequency === loan.paymentFrequency &&
      newStructure === loan.repaymentStructure
    ) {
      throw new AppError('CONFLICT', 'No terms have changed. Update at least one field to restructure.', 409);
    }

    // Block restructure if any unresolved installment has allocation rows: deleting it
    // would cascade-delete immutable repayment audit history, including reversals.
    const allocatedUnpaid = await tx.loanPaymentAllocation.findFirst({
      where: {
        installment: { loanId: id, status: { not: 'PAID' } },
      },
    });
    if (allocatedUnpaid) {
      throw new AppError('CONFLICT', 'Cannot restructure: unresolved installments have recorded payment allocations.', 409);
    }

    // Count paid installments so new sequences don't collide with preserved ones
    const paidCount = await tx.loanInstallment.count({
      where: { loanId: id, status: 'PAID' },
    });

    // Drop all unresolved installments; preserve PAID ones for audit history
    await tx.loanInstallment.deleteMany({
      where: { loanId: id, status: { not: 'PAID' } },
    });

    // Rebuild schedule from today against remaining principal balance
    const installments = buildInstallments(
      id,
      Number(loan.remainingBalance),
      newRate,
      newTerm,
      newFrequency,
      newStructure,
      new Date(),
      loan.accrualConvention,
    ).map((inst) => ({ ...inst, sequence: inst.sequence + paidCount }));

    await tx.loanInstallment.createMany({ data: installments });

    // Schedule restarts today, so the end date is the last rebuilt installment's
    // due date — not term months from original disbursement.
    const newEndDate = installments[installments.length - 1]!.dueDate;

    const updated = await tx.loan.update({
      where: { id },
      data: {
        interestRate: new Decimal(newRate),
        termMonths: newTerm,
        paymentFrequency: newFrequency,
        repaymentStructure: newStructure,
        endDate: newEndDate,
        status: 'ACTIVE',
      },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'LOAN_RESTRUCTURED',
        targetId: id,
        metadata: {
          reason: data.reason,
          newInterestRate: newRate,
          newTermMonths: newTerm,
          newPaymentFrequency: newFrequency,
          newRepaymentStructure: newStructure,
          remainingBalance: loan.remainingBalance,
        },
      },
    });

    return updated;
  });
}
