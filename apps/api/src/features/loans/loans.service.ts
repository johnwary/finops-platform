import { Decimal } from '@prisma/client/runtime/client';
import { randomUUID } from 'node:crypto';
import { addMonths, addWeeks, addDays, differenceInDays } from 'date-fns';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';
import { resolveProvisionBucket } from '../../lib/lending.js';
import type {
  CreateLoanInput,
  ApproveLoanInput,
  DisburseLoanInput,
  CancelLoanInput,
  RecordPaymentInput,
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

function receiptNumber(date = new Date()): string {
  const day = date.toISOString().slice(0, 10).replaceAll('-', '');
  return `RCPT-${day}-${randomUUID().slice(0, 8).toUpperCase()}`;
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

  const expectedPrincipal = new Decimal(principal).toDecimalPlaces(2);
  const scheduledPrincipal = installments.reduce(
    (sum, installment) => sum.plus(installment.principal),
    new Decimal(0),
  );
  const roundingDelta = expectedPrincipal.minus(scheduledPrincipal);
  if (!roundingDelta.equals(0)) {
    const last = installments[installments.length - 1];
    last.principal = last.principal.plus(roundingDelta).toDecimalPlaces(2);
  }

  return installments;
}

type InstallmentWithAllocations = {
  id: string;
  principal: Decimal;
  interest: Decimal;
  allocations: Array<{
    principalApplied: Decimal;
    interestApplied: Decimal;
    penaltiesApplied: Decimal;
  }>;
};

type PaymentAllocationPlan = {
  allocations: Array<{
    installmentId: string;
    principalApplied: Decimal;
    interestApplied: Decimal;
    penaltiesApplied: Decimal;
  }>;
  principalPortion: Decimal;
  interestPortion: Decimal;
  penalties: Decimal;
};

function minDecimal(a: Decimal, b: Decimal): Decimal {
  return a.lessThan(b) ? a : b;
}

function maxZero(value: Decimal): Decimal {
  return value.lessThan(0) ? new Decimal(0) : value;
}

function sumAllocationField(
  allocations: InstallmentWithAllocations['allocations'],
  field: keyof InstallmentWithAllocations['allocations'][number],
): Decimal {
  return allocations.reduce((sum, allocation) => sum.plus(allocation[field]), new Decimal(0));
}

function buildPaymentAllocationPlan(
  amount: Decimal,
  installments: InstallmentWithAllocations[],
): PaymentAllocationPlan {
  let remaining = amount;
  let principalPortion = new Decimal(0);
  let interestPortion = new Decimal(0);
  const penalties = new Decimal(0);
  const allocations: PaymentAllocationPlan['allocations'] = [];

  for (const installment of installments) {
    if (remaining.equals(0)) break;

    const principalOutstanding = maxZero(
      new Decimal(installment.principal).minus(
        sumAllocationField(installment.allocations, 'principalApplied'),
      ),
    );
    const interestOutstanding = maxZero(
      new Decimal(installment.interest).minus(
        sumAllocationField(installment.allocations, 'interestApplied'),
      ),
    );

    const interestApplied = minDecimal(remaining, interestOutstanding);
    remaining = remaining.minus(interestApplied);
    interestPortion = interestPortion.plus(interestApplied);

    const principalApplied = minDecimal(remaining, principalOutstanding);
    remaining = remaining.minus(principalApplied);
    principalPortion = principalPortion.plus(principalApplied);

    if (interestApplied.greaterThan(0) || principalApplied.greaterThan(0)) {
      allocations.push({
        installmentId: installment.id,
        principalApplied,
        interestApplied,
        penaltiesApplied: penalties,
      });
    }
  }

  if (remaining.greaterThan(0)) {
    throw new AppError(
      'PAYMENT_EXCEEDS_RECEIVABLE',
      'Payment amount exceeds outstanding scheduled loan receivable.',
      409,
    );
  }

  return { allocations, principalPortion, interestPortion, penalties };
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

export async function listLoans({ cursor, limit, borrowerId, status, search, type }: ListLoansInput) {
  const where: Record<string, unknown> = { deletedAt: null };

  if (borrowerId) where.borrowerId = borrowerId;
  if (status) where.status = status;
  if (type) where.type = type;
  if (search) {
    where.OR = [
      { borrower: { firstName: { contains: search, mode: 'insensitive' } } },
      { borrower: { middleName: { contains: search, mode: 'insensitive' } } },
      { borrower: { lastName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const loans = await prisma.loan.findMany({
    where,
    orderBy: { createdAt: 'desc' },
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
  const loan = await prisma.loan.findFirst({ where: { id, deletedAt: null } });
  if (!loan) throw new AppError('NOT_FOUND', 'Loan not found.', 404);

  if (loan.status !== 'PENDING') {
    throw new AppError('LOAN_INVALID_STATE', `Cannot approve a loan with status ${loan.status}.`, 409);
  }

  const approvedAt = data.approvedAt
    ? new Date(Date.UTC(data.approvedAt.getUTCFullYear(), data.approvedAt.getUTCMonth(), data.approvedAt.getUTCDate(), 4, 0, 0))
    : new Date();

  return prisma.$transaction(async (tx) => {
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
  const loan = await prisma.loan.findFirst({ where: { id, deletedAt: null } });
  if (!loan) throw new AppError('NOT_FOUND', 'Loan not found.', 404);

  if (loan.status !== 'APPROVED') {
    throw new AppError('LOAN_INVALID_STATE', `Cannot disburse a loan with status ${loan.status}.`, 409);
  }

  // Use noon Manila time (UTC+8 = UTC+480 min) to avoid UTC day-shift on date-only input
  const disbursedAt = data.disbursedAt
    ? new Date(Date.UTC(data.disbursedAt.getUTCFullYear(), data.disbursedAt.getUTCMonth(), data.disbursedAt.getUTCDate(), 4, 0, 0))
    : new Date();
  const endDate = addMonths(disbursedAt, loan.termMonths);

  const installments = buildInstallments(
    id,
    Number(loan.amount),
    Number(loan.interestRate),
    loan.termMonths,
    loan.paymentFrequency,
    loan.repaymentStructure,
    disbursedAt,
  );

  return prisma.$transaction(async (tx) => {
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

  if (loan.status !== 'ACTIVE' && loan.status !== 'IN_ARREARS') {
    throw new AppError('LOAN_INVALID_STATE', `Cannot record payment on a loan with status ${loan.status}.`, 409);
  }

  if (loan.locked) {
    throw new AppError('LOAN_LOCKED', 'Loan is locked and cannot accept payments.', 409);
  }

  const paymentAmount = new Decimal(data.amount);

  const oldestUnpaid = await prisma.loanInstallment.findFirst({
    where: { loanId: id, status: { not: 'PAID' } },
    orderBy: [{ dueDate: 'asc' }, { sequence: 'asc' }],
    include: { allocations: { select: { interestApplied: true } } },
  });

  if (oldestUnpaid) {
    const alreadyApplied = oldestUnpaid.allocations.reduce(
      (sum, a) => sum.plus(a.interestApplied),
      new Decimal(0),
    );
    const interestOutstanding = new Decimal(oldestUnpaid.interest).minus(alreadyApplied);
    if (interestOutstanding.greaterThan(0) && paymentAmount.lessThan(interestOutstanding)) {
      throw new AppError(
        'PAYMENT_BELOW_MINIMUM',
        `Payment must be at least the outstanding interest on the oldest unpaid installment (${interestOutstanding.toFixed(2)}).`,
        409,
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const installments = await tx.loanInstallment.findMany({
      where: { loanId: id, status: { not: 'PAID' } },
      orderBy: [{ dueDate: 'asc' }, { sequence: 'asc' }],
      include: {
        allocations: {
          select: {
            principalApplied: true,
            interestApplied: true,
            penaltiesApplied: true,
          },
        },
      },
    });

    const allocationPlan = buildPaymentAllocationPlan(paymentAmount, installments);
    const newTotalPaid = new Decimal(loan.totalPaid).plus(paymentAmount);
    const newRemainingBalance = new Decimal(loan.remainingBalance).minus(
      allocationPlan.principalPortion,
    );

    if (newRemainingBalance.lessThan(0)) {
      throw new AppError(
        'PAYMENT_EXCEEDS_BALANCE',
        'Allocated principal exceeds remaining principal balance.',
        409,
      );
    }

    const isPaidOff = newRemainingBalance.equals(0);

    const payment = await tx.loanPayment.create({
      data: {
        loanId: id,
        amount: paymentAmount,
        principalPortion: allocationPlan.principalPortion,
        interestPortion: allocationPlan.interestPortion,
        penalties: allocationPlan.penalties,
        paidAt: data.paidAt ?? new Date(),
        method: data.method,
        receiptNumber: receiptNumber(data.paidAt),
        reference: data.reference,
        notes: data.notes,
      },
    });

    if (allocationPlan.allocations.length > 0) {
      await tx.loanPaymentAllocation.createMany({
        data: allocationPlan.allocations.map((allocation) => ({
          paymentId: payment.id,
          ...allocation,
        })),
      });

      // Mark installments PAID when fully covered by cumulative allocations
      const touchedInstallmentIds = allocationPlan.allocations.map((a) => a.installmentId);
      const touchedInstallments = await tx.loanInstallment.findMany({
        where: { id: { in: touchedInstallmentIds } },
        include: {
          allocations: {
            select: { principalApplied: true, interestApplied: true },
          },
        },
      });

      const fullyPaidIds = touchedInstallments
        .filter((inst) => {
          const totalPrincipalApplied = inst.allocations.reduce(
            (sum, a) => sum.plus(a.principalApplied),
            new Decimal(0),
          );
          const totalInterestApplied = inst.allocations.reduce(
            (sum, a) => sum.plus(a.interestApplied),
            new Decimal(0),
          );
          return (
            totalPrincipalApplied.greaterThanOrEqualTo(inst.principal) &&
            totalInterestApplied.greaterThanOrEqualTo(inst.interest)
          );
        })
        .map((inst) => inst.id);

      if (fullyPaidIds.length > 0) {
        await tx.loanInstallment.updateMany({
          where: { id: { in: fullyPaidIds } },
          data: { status: 'PAID' },
        });
      }
    }

    await tx.loan.update({
      where: { id },
      data: {
        totalPaid: newTotalPaid,
        remainingBalance: newRemainingBalance,
        ...(isPaidOff ? { status: 'PAID', paidAt: data.paidAt ?? new Date() } : {}),
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
          receiptNumber: payment.receiptNumber,
          amount: paymentAmount,
          principalPortion: allocationPlan.principalPortion,
          interestPortion: allocationPlan.interestPortion,
          penalties: allocationPlan.penalties,
          remainingBalance: newRemainingBalance,
          method: data.method,
          reference: data.reference ?? null,
          paidAt: payment.paidAt,
        },
      },
    });

    return payment;
  });
}

export async function defaultLoan(id: string, data: DefaultLoanInput, actor: Actor) {
  const loan = await prisma.loan.findFirst({ where: { id, deletedAt: null } });
  if (!loan) throw new AppError('NOT_FOUND', 'Loan not found.', 404);

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
    // SELECT FOR UPDATE acquires a row-level lock — concurrent calls block here until
    // the first transaction commits, preventing duplicate provision events.
    const rows = await tx.$queryRaw<{ id: string; status: string; remainingBalance: string; deletedAt: Date | null }[]>`
      SELECT id, status, "remainingBalance", "deletedAt"
      FROM "Loan"
      WHERE id = ${id}
      FOR UPDATE
    `;
    const lockedLoan = rows[0];
    if (!lockedLoan || lockedLoan.deletedAt != null) throw new AppError('NOT_FOUND', 'Loan not found.', 404);

    if (lockedLoan.status !== 'ACTIVE' && lockedLoan.status !== 'IN_ARREARS') {
      throw new AppError('LOAN_INVALID_STATE', `Cannot default a loan with status ${lockedLoan.status}.`, 409);
    }

    const { bucket, rate } = resolveProvisionBucket(dpd);
    const basisAmount = new Decimal(lockedLoan.remainingBalance);
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
          remainingBalance: lockedLoan.remainingBalance,
        },
      },
    });

    return updated;
  });
}

export async function softDeleteLoan(id: string, actor: Actor) {
  const loan = await prisma.loan.findFirst({ where: { id, deletedAt: null } });
  if (!loan) throw new AppError('NOT_FOUND', 'Loan not found.', 404);

  if (loan.status === 'ACTIVE' || loan.status === 'IN_ARREARS') {
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

export async function restoreLoan(id: string, actor: Actor) {
  const loan = await prisma.loan.findFirst({ where: { id, deletedAt: { not: null } } });
  if (!loan) throw new AppError('NOT_FOUND', 'Deleted loan not found.', 404);

  return prisma.$transaction(async (tx) => {
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
  const loan = await prisma.loan.findFirst({ where: { id, deletedAt: null } });
  if (!loan) throw new AppError('NOT_FOUND', 'Loan not found.', 404);

  if (loan.status !== 'ACTIVE') {
    throw new AppError('LOAN_INVALID_STATE', `Cannot mark a loan with status ${loan.status} as in arrears.`, 409);
  }

  return prisma.$transaction(async (tx) => {
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
  const loan = await prisma.loan.findFirst({ where: { id, deletedAt: null } });
  if (!loan) throw new AppError('NOT_FOUND', 'Loan not found.', 404);

  if (loan.status !== 'IN_ARREARS') {
    throw new AppError('LOAN_INVALID_STATE', `Cannot mark a loan with status ${loan.status} as current.`, 409);
  }

  return prisma.$transaction(async (tx) => {
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
  const loan = await prisma.loan.findFirst({ where: { id, deletedAt: null } });
  if (!loan) throw new AppError('NOT_FOUND', 'Loan not found.', 404);

  if (loan.status !== 'DEFAULTED') {
    throw new AppError('LOAN_INVALID_STATE', `Cannot write off a loan with status ${loan.status}.`, 409);
  }

  return prisma.$transaction(async (tx) => {
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
