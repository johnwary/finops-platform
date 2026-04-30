import { Decimal } from '@prisma/client/runtime/client';
import { addMonths, addWeeks, addDays, differenceInDays } from 'date-fns';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/response';
import type {
  CreateLoanInput,
  DisburseLoanInput,
  CancelLoanInput,
  RecordPaymentInput,
  DefaultLoanInput,
  ListLoansInput,
} from './loans.schema';

// BSP-aligned provision buckets (rates are regulatory minimums — update when BSP revises)
const PROVISION_BUCKETS = [
  { maxDpd: 30,       bucket: 1, rate: 0.01 }, // Pass
  { maxDpd: 90,       bucket: 2, rate: 0.05 }, // Special Mention
  { maxDpd: 180,      bucket: 3, rate: 0.25 }, // Substandard
  { maxDpd: 365,      bucket: 4, rate: 0.50 }, // Doubtful
  { maxDpd: Infinity, bucket: 5, rate: 1.00 }, // Loss
] as const;

function resolveProvisionBucket(dpd: number): { bucket: number; rate: number } {
  for (const b of PROVISION_BUCKETS) {
    if (dpd <= b.maxDpd) return { bucket: b.bucket, rate: b.rate };
  }
  return { bucket: 5, rate: 1.0 };
}

interface Actor {
  id: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2002'
  );
}

function toDecimal(value: number | null | undefined): Decimal | undefined {
  return value != null ? new Decimal(value) : undefined;
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
function installmentCount(termMonths: number, frequency: string): number {
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

/** Amortizing: equal P+I per period. Interest-only: flat interest, principal lump at end. */
function buildInstallments(
  loanId: string,
  principal: number,
  monthlyRate: number,
  termMonths: number,
  frequency: string,
  repaymentStructure: string,
  startDate: Date,
): Array<{
  loanId: string;
  sequence: number;
  dueDate: Date;
  principal: Decimal;
  interest: Decimal;
}> {
  const count = installmentCount(termMonths, frequency);

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

  const installments = [];

  if (repaymentStructure === 'INTEREST_ONLY') {
    const interestPerPeriod = principal * periodRate;
    for (let i = 1; i <= count; i++) {
      const isLast = i === count;
      installments.push({
        loanId,
        sequence: i,
        dueDate: installmentDueDate(startDate, frequency, i),
        principal: new Decimal(isLast ? principal : 0).toDecimalPlaces(2),
        interest: new Decimal(interestPerPeriod).toDecimalPlaces(2),
      });
    }
  } else {
    // Amortizing: PMT = P * r / (1 - (1+r)^-n)
    let balance = principal;
    const pmt =
      periodRate === 0
        ? principal / count
        : (principal * periodRate) / (1 - Math.pow(1 + periodRate, -count));

    for (let i = 1; i <= count; i++) {
      const interestDue = balance * periodRate;
      const principalDue = Math.min(pmt - interestDue, balance);
      balance -= principalDue;

      installments.push({
        loanId,
        sequence: i,
        dueDate: installmentDueDate(startDate, frequency, i),
        principal: new Decimal(principalDue).toDecimalPlaces(2),
        interest: new Decimal(interestDue).toDecimalPlaces(2),
      });
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

  const endDate = addMonths(data.startDate, data.termMonths);

  try {
    return await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: {
          borrowerId: data.borrowerId,
          type: data.type,
          amount: new Decimal(data.amount),
          interestRate: new Decimal(data.interestRate),
          termMonths: data.termMonths,
          startDate: data.startDate,
          endDate,
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
        select: { id: true, name: true, email: true, phone: true },
      },
      loanInstallments: {
        orderBy: { sequence: 'asc' },
      },
      loanPayments: {
        orderBy: { paidAt: 'desc' },
      },
    },
  });

  if (!loan) throw new AppError('NOT_FOUND', 'Loan not found.', 404);
  return loan;
}

export async function listLoans({ cursor, limit, borrowerId, status, search }: ListLoansInput) {
  const where: Record<string, unknown> = { deletedAt: null };

  if (borrowerId) where.borrowerId = borrowerId;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { borrower: { name: { contains: search, mode: 'insensitive' } } },
      { purpose: { contains: search, mode: 'insensitive' } },
    ];
  }

  const loans = await prisma.loan.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    take: limit + 1,
    include: {
      borrower: { select: { id: true, name: true, email: true } },
    },
  });

  const hasMore = loans.length > limit;
  const data = hasMore ? loans.slice(0, limit) : loans;
  const nextCursor = hasMore ? (data[data.length - 1]?.id ?? null) : null;

  return { data, meta: { nextCursor, hasMore, limit } };
}

export async function approveLoan(id: string, actor: Actor) {
  const loan = await prisma.loan.findFirst({ where: { id, deletedAt: null } });
  if (!loan) throw new AppError('NOT_FOUND', 'Loan not found.', 404);

  if (loan.status !== 'PENDING') {
    throw new AppError('LOAN_INVALID_STATE', `Cannot approve a loan with status ${loan.status}.`, 409);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.loan.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
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
  const loan = await prisma.loan.findFirst({ where: { id, deletedAt: null } });
  if (!loan) throw new AppError('NOT_FOUND', 'Loan not found.', 404);

  if (loan.status !== 'APPROVED') {
    throw new AppError('LOAN_INVALID_STATE', `Cannot disburse a loan with status ${loan.status}.`, 409);
  }

  const installments = buildInstallments(
    id,
    Number(loan.amount),
    Number(loan.interestRate),
    loan.termMonths,
    loan.paymentFrequency,
    loan.repaymentStructure,
    loan.startDate,
  );

  return prisma.$transaction(async (tx) => {
    const updated = await tx.loan.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        disbursedAt: new Date(),
        disbursedById: actor.id,
        disbursementMethod: data.disbursementMethod,
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

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'LOAN_DISBURSED',
        targetId: id,
        metadata: {
          method: data.disbursementMethod,
          installmentsGenerated: installments.length,
        },
      },
    });

    return updated;
  });
}

export async function cancelLoan(id: string, data: CancelLoanInput, actor: Actor) {
  const loan = await prisma.loan.findFirst({ where: { id, deletedAt: null } });
  if (!loan) throw new AppError('NOT_FOUND', 'Loan not found.', 404);

  if (loan.status !== 'PENDING' && loan.status !== 'APPROVED') {
    throw new AppError(
      'LOAN_INVALID_STATE',
      `Cannot cancel a loan with status ${loan.status}.`,
      409,
    );
  }

  return prisma.$transaction(async (tx) => {
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
  const loan = await prisma.loan.findFirst({ where: { id, deletedAt: null } });
  if (!loan) throw new AppError('NOT_FOUND', 'Loan not found.', 404);

  if (loan.status !== 'ACTIVE') {
    throw new AppError('LOAN_INVALID_STATE', `Cannot record payment on a loan with status ${loan.status}.`, 409);
  }

  if (loan.locked) {
    throw new AppError('LOAN_LOCKED', 'Loan is locked and cannot accept payments.', 409);
  }

  const paymentAmount = new Decimal(data.amount);
  const newTotalPaid = new Decimal(loan.totalPaid).plus(paymentAmount);
  const newRemainingBalance = new Decimal(loan.remainingBalance).minus(paymentAmount);

  if (newRemainingBalance.lessThan(0)) {
    throw new AppError('PAYMENT_EXCEEDS_BALANCE', 'Payment amount exceeds remaining balance.', 409);
  }

  const isPaidOff = newRemainingBalance.equals(0);

  return prisma.$transaction(async (tx) => {
    const payment = await tx.loanPayment.create({
      data: {
        loanId: id,
        amount: paymentAmount,
        principalPortion: new Decimal(data.principalPortion),
        interestPortion: new Decimal(data.interestPortion),
        investmentReturn: new Decimal(data.investmentReturn),
        insurance: new Decimal(data.insurance),
        penalties: new Decimal(data.penalties),
        paidAt: data.paidAt ?? new Date(),
        method: data.method,
        reference: data.reference,
        notes: data.notes,
      },
    });

    await tx.loan.update({
      where: { id },
      data: {
        totalPaid: newTotalPaid,
        remainingBalance: newRemainingBalance,
        ...(isPaidOff ? { status: 'PAID', paidAt: new Date() } : {}),
      },
    });

    // Capital inflow: payment returns funds to business
    await tx.capitalEntry.create({
      data: {
        flowType: 'INFLOW',
        source: 'LOAN_PAYMENT',
        sourceId: payment.id,
        amount: paymentAmount,
        description: `Payment recorded for loan ${id}`,
        createdById: actor.id,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: isPaidOff ? 'LOAN_PAID_OFF' : 'LOAN_PAYMENT_RECORDED',
        targetId: id,
        metadata: {
          paymentId: payment.id,
          amount: paymentAmount,
          remainingBalance: newRemainingBalance,
        },
      },
    });

    return payment;
  });
}

export async function defaultLoan(id: string, data: DefaultLoanInput, actor: Actor) {
  const loan = await prisma.loan.findFirst({ where: { id, deletedAt: null } });
  if (!loan) throw new AppError('NOT_FOUND', 'Loan not found.', 404);

  if (loan.status !== 'ACTIVE') {
    throw new AppError('LOAN_INVALID_STATE', `Cannot default a loan with status ${loan.status}.`, 409);
  }

  // Compute DPD from earliest overdue installment, or use caller-supplied override
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

  const { bucket, rate } = resolveProvisionBucket(dpd);
  const basisAmount = new Decimal(loan.remainingBalance);
  const provisionAmount = basisAmount.times(rate).toDecimalPlaces(2);

  return prisma.$transaction(async (tx) => {
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
  const loan = await prisma.loan.findFirst({ where: { id, deletedAt: null } });
  if (!loan) throw new AppError('NOT_FOUND', 'Loan not found.', 404);

  if (loan.status === 'ACTIVE') {
    throw new AppError('LOAN_INVALID_STATE', 'Cannot delete an active loan.', 409);
  }

  return prisma.$transaction(async (tx) => {
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
