import { Decimal } from '@prisma/client/runtime/client';
import { differenceInDays } from 'date-fns';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import type { Loan, Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/response.js';
import type { RecordPaymentInput, ReversePaymentInput } from './loans.schema.js';

interface Actor {
  id: string;
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

function receiptNumber(date = new Date()): string {
  const day = date.toISOString().slice(0, 10).replaceAll('-', '');
  return `RCPT-${day}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

type InstallmentWithAllocations = {
  id: string;
  principal: Decimal;
  interest: Decimal;
  dueDate: Date;
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

// penaltyRate is a daily rate applied to the outstanding principal of each overdue installment.
function computeAccruedPenalty(
  installment: InstallmentWithAllocations,
  dailyRate: Decimal,
  asOf: Date,
): Decimal {
  if (dailyRate.equals(0) || installment.dueDate >= asOf) return new Decimal(0);
  const dpd = Math.max(0, differenceInDays(asOf, installment.dueDate));
  const principalOutstanding = maxZero(
    new Decimal(installment.principal).minus(
      sumAllocationField(installment.allocations, 'principalApplied'),
    ),
  );
  const alreadyCharged = sumAllocationField(installment.allocations, 'penaltiesApplied');
  const accrued = principalOutstanding.times(dailyRate).times(dpd).toDecimalPlaces(2);
  return maxZero(accrued.minus(alreadyCharged));
}

function buildPaymentAllocationPlan(
  amount: Decimal,
  installments: InstallmentWithAllocations[],
  dailyPenaltyRate: Decimal,
  asOf: Date,
): PaymentAllocationPlan {
  let remaining = amount;
  let principalPortion = new Decimal(0);
  let interestPortion = new Decimal(0);
  let totalPenalties = new Decimal(0);
  const allocations: PaymentAllocationPlan['allocations'] = [];

  for (const installment of installments) {
    if (remaining.equals(0)) break;

    const penaltyDue = computeAccruedPenalty(installment, dailyPenaltyRate, asOf);
    const interestOutstanding = maxZero(
      new Decimal(installment.interest).minus(
        sumAllocationField(installment.allocations, 'interestApplied'),
      ),
    );
    const principalOutstanding = maxZero(
      new Decimal(installment.principal).minus(
        sumAllocationField(installment.allocations, 'principalApplied'),
      ),
    );

    // Apply in order: penalties → interest → principal
    const penaltiesApplied = minDecimal(remaining, penaltyDue);
    remaining = remaining.minus(penaltiesApplied);
    totalPenalties = totalPenalties.plus(penaltiesApplied);

    const interestApplied = minDecimal(remaining, interestOutstanding);
    remaining = remaining.minus(interestApplied);
    interestPortion = interestPortion.plus(interestApplied);

    const principalApplied = minDecimal(remaining, principalOutstanding);
    remaining = remaining.minus(principalApplied);
    principalPortion = principalPortion.plus(principalApplied);

    if (penaltiesApplied.greaterThan(0) || interestApplied.greaterThan(0) || principalApplied.greaterThan(0)) {
      allocations.push({
        installmentId: installment.id,
        principalApplied,
        interestApplied,
        penaltiesApplied,
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

  return { allocations, principalPortion, interestPortion, penalties: totalPenalties };
}

export async function recordLoanPayment(id: string, data: RecordPaymentInput, actor: Actor) {
  const paymentAmount = new Decimal(data.amount);
  const asOf = data.paidAt ?? new Date();

  return prisma.$transaction(async (tx) => {
    const loan = await lockedLoan(tx, id);
    assertLoanStatus(loan, ['ACTIVE', 'IN_ARREARS'], `Cannot record payment on a loan with status ${loan.status}.`);

    if (loan.locked) {
      throw new AppError('LOAN_LOCKED', 'Loan is locked and cannot accept payments.', 409);
    }

    const dailyPenaltyRate = loan.penaltyRate ? new Decimal(loan.penaltyRate) : new Decimal(0);
    const oldestUnpaid = await tx.loanInstallment.findFirst({
      where: { loanId: id, status: { not: 'PAID' } },
      orderBy: [{ dueDate: 'asc' }, { sequence: 'asc' }],
      include: {
        allocations: {
          where: { payment: { reversedAt: null } },
          select: { principalApplied: true, interestApplied: true, penaltiesApplied: true },
        },
      },
    });

    if (oldestUnpaid) {
      const alreadyInterest = oldestUnpaid.allocations.reduce(
        (sum, a) => sum.plus(a.interestApplied),
        new Decimal(0),
      );
      const interestOutstanding = new Decimal(oldestUnpaid.interest).minus(alreadyInterest);
      const penaltyDue = computeAccruedPenalty(
        { ...oldestUnpaid, dueDate: oldestUnpaid.dueDate, allocations: oldestUnpaid.allocations },
        dailyPenaltyRate,
        asOf,
      );
      const minimumDue = penaltyDue.plus(maxZero(interestOutstanding));
      if (minimumDue.greaterThan(0) && paymentAmount.lessThan(minimumDue)) {
        throw new AppError(
          'PAYMENT_BELOW_MINIMUM',
          `Payment must be at least the outstanding penalties and interest on the oldest unpaid installment (${minimumDue.toFixed(2)}).`,
          409,
        );
      }
    }

    const installments = await tx.loanInstallment.findMany({
      where: { loanId: id, status: { not: 'PAID' } },
      orderBy: [{ dueDate: 'asc' }, { sequence: 'asc' }],
      include: {
        allocations: {
          where: { payment: { reversedAt: null } },
          select: {
            principalApplied: true,
            interestApplied: true,
            penaltiesApplied: true,
          },
        },
      },
    });

    const allocationPlan = buildPaymentAllocationPlan(paymentAmount, installments, dailyPenaltyRate, asOf);
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
            where: { payment: { reversedAt: null } },
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

export async function reverseLoanPayment(
  loanId: string,
  paymentId: string,
  data: ReversePaymentInput,
  actor: Actor,
) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const loan = await lockedLoan(tx, loanId);
    assertLoanStatus(
      loan,
      ['ACTIVE', 'IN_ARREARS', 'PAID'],
      `Cannot reverse a payment on a loan with status ${loan.status}.`,
    );

    const payment = await tx.loanPayment.findFirst({ where: { id: paymentId, loanId } });
    if (!payment) throw new AppError('NOT_FOUND', 'Payment not found.', 404);
    if (payment.reversedAt) {
      throw new AppError('CONFLICT', 'Payment has already been reversed.', 409);
    }

    // LIFO-only: allocation math assumes earlier payments stand, so "latest" must
    // be the payment applied last = highest createdAt (recording order), NOT paidAt.
    // paidAt is caller-supplied and backdatable, so it does not reflect apply order.
    // See docs/business-rules.md.
    const latest = await tx.loanPayment.findFirst({
      where: { loanId, reversedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (latest?.id !== paymentId) {
      throw new AppError(
        'CONFLICT',
        'Only the most recent payment can be reversed. Reverse newer payments first.',
        409,
      );
    }

    // Unwind allocations and reopen affected installments.
    const allocations = await tx.loanPaymentAllocation.findMany({
      where: { paymentId },
      select: { installmentId: true },
    });
    const affectedIds = allocations.map((a) => a.installmentId);

    if (affectedIds.length > 0) {
      await tx.loanInstallment.updateMany({
        where: { id: { in: affectedIds }, dueDate: { lt: now } },
        data: { status: 'OVERDUE' },
      });
      await tx.loanInstallment.updateMany({
        where: { id: { in: affectedIds }, dueDate: { gte: now } },
        data: { status: 'SCHEDULED' },
      });
    }

    const newTotalPaid = new Decimal(loan.totalPaid).minus(payment.amount);
    const newRemainingBalance = new Decimal(loan.remainingBalance).plus(payment.principalPortion);
    const reopens = loan.status === 'PAID' && newRemainingBalance.greaterThan(0);

    await tx.loan.update({
      where: { id: loanId },
      data: {
        totalPaid: newTotalPaid,
        remainingBalance: newRemainingBalance,
        ...(reopens ? { status: 'ACTIVE', paidAt: null } : {}),
      },
    });

    const reversed = await tx.loanPayment.update({
      where: { id: paymentId },
      data: { reversedAt: now, reversedById: actor.id, reversalReason: data.reason },
    });

    // Exclusion model: mark the original capital entry reversed; reports
    // filter reversedAt — no compensating entry (see docs/business-rules.md).
    await tx.capitalEntry.updateMany({
      where: { source: 'LOAN_PAYMENT', sourceId: paymentId, reversedAt: null },
      data: { reversedAt: now, reversalReason: data.reason },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'LOAN_PAYMENT_REVERSED',
        targetId: loanId,
        metadata: {
          paymentId,
          receiptNumber: payment.receiptNumber,
          amount: payment.amount,
          principalPortion: payment.principalPortion,
          reason: data.reason,
          loanReopened: reopens,
        },
      },
    });

    return reversed;
  });
}
