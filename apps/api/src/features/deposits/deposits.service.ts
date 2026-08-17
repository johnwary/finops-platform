import { Decimal } from '@prisma/client/runtime/client';
import { addMonths } from 'date-fns';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';
import type { Deposit, Prisma } from '../../generated/prisma/client.js';
import type {
  CreateDepositInput,
  UpdateDepositInput,
  WithdrawDepositInput,
  CloseDepositInput,
  RecordPayoutInput,
  ReversePayoutInput,
  ListDepositsInput,
} from './deposits.schema.js';

interface Actor {
  id: string;
}

// Re-read a deposit under a row lock inside a transaction, guarding against a
// concurrent state change (payout, withdrawal, close) between the initial read
// and the write. Mirrors lockedLoan() in loans.service.
async function lockedActiveDeposit(tx: Prisma.TransactionClient, id: string, verb: string): Promise<Deposit> {
  const rows = await tx.$queryRaw<Deposit[]>`
    SELECT * FROM "Deposit" WHERE id = ${id} FOR UPDATE
  `;
  const deposit = rows[0];
  if (!deposit || deposit.deletedAt != null) {
    throw new AppError('NOT_FOUND', 'Deposit not found.', 404);
  }
  if (deposit.status !== 'ACTIVE') {
    throw new AppError('DEPOSIT_INVALID_STATE', `Cannot ${verb} a deposit with status ${deposit.status}.`, 409);
  }
  return deposit;
}

export async function createDeposit(data: CreateDepositInput, actor: Actor) {
  const depositor = await prisma.depositor.findFirst({
    where: { id: data.depositorId, deletedAt: null },
  });
  if (!depositor) throw new AppError('NOT_FOUND', 'Depositor not found.', 404);

  const endDate = addMonths(data.startDate, data.termMonths);

  return prisma.$transaction(async (tx) => {
    const deposit = await tx.deposit.create({
      data: {
        depositorId: data.depositorId,
        amount: new Decimal(data.amount),
        expectedReturnRate: new Decimal(data.expectedReturnRate),
        expectedReturnRatePeriod: data.expectedReturnRatePeriod,
        termMonths: data.termMonths,
        startDate: data.startDate,
        endDate,
        depositType: data.depositType,
        payoutType: data.payoutType,
        reference: data.reference,
        notes: data.notes,
      },
    });

    // Capital inflow: depositor funds enter the business
    await tx.capitalEntry.create({
      data: {
        flowType: 'INFLOW',
        source: 'DEPOSIT',
        sourceId: deposit.id,
        amount: new Decimal(data.amount),
        description: `Deposit received from depositor ${data.depositorId}`,
        createdById: actor.id,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'DEPOSIT_CREATED',
        targetId: deposit.id,
        metadata: {
          depositorId: deposit.depositorId,
          amount: deposit.amount,
          termMonths: deposit.termMonths,
        },
      },
    });

    return deposit;
  });
}

export async function getDeposit(id: string) {
  const deposit = await prisma.deposit.findFirst({
    where: { id, deletedAt: null },
    include: {
      depositor: { select: { id: true, name: true, email: true, phone: true } },
      payouts: { orderBy: { paidAt: 'desc' } },
    },
  });

  if (!deposit) throw new AppError('NOT_FOUND', 'Deposit not found.', 404);
  return deposit;
}

export async function listDeposits({
  cursor,
  limit,
  depositorId,
  status,
  depositType,
}: ListDepositsInput) {
  const where: Record<string, unknown> = { deletedAt: null };

  if (depositorId) where.depositorId = depositorId;
  if (status) where.status = status;
  if (depositType) where.depositType = depositType;

  const deposits = await prisma.deposit.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    take: limit + 1,
    include: {
      depositor: { select: { id: true, name: true, email: true } },
    },
  });

  const hasMore = deposits.length > limit;
  const data = hasMore ? deposits.slice(0, limit) : deposits;
  const nextCursor = hasMore ? (data[data.length - 1]?.id ?? null) : null;

  return { data, meta: { nextCursor, hasMore, limit } };
}

export async function updateDeposit(id: string, data: UpdateDepositInput, actor: Actor) {
  const deposit = await prisma.deposit.findFirst({ where: { id, deletedAt: null } });
  if (!deposit) throw new AppError('NOT_FOUND', 'Deposit not found.', 404);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.deposit.update({
      where: { id },
      data,
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'DEPOSIT_UPDATED',
        targetId: id,
        metadata: { fields: Object.keys(data) },
      },
    });

    return updated;
  });
}

// Principal already returned through payouts must not be paid out again at
// termination — only the unreturned remainder leaves the ledger.
function unreturnedPrincipal(deposit: Deposit): Decimal {
  const remaining = new Decimal(deposit.amount).minus(deposit.principalReturned);
  return remaining.lessThan(0) ? new Decimal(0) : remaining;
}

export async function withdrawDeposit(id: string, data: WithdrawDepositInput, actor: Actor) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const deposit = await lockedActiveDeposit(tx, id, 'withdraw');
    const principalOutflow = unreturnedPrincipal(deposit);

    const updated = await tx.deposit.update({
      where: { id },
      data: {
        status: 'WITHDRAWN',
        hasBeenWithdrawn: true,
        withdrawnAt: now,
        // principalReturned stays payout-only: the terminal principal return is the
        // CapitalEntry below. Setting it to deposit.amount here breaks the frontend's
        // returnEarned (= totalPayoutPaid - principalReturned) for terminated deposits.
        notes: data.notes ?? deposit.notes,
      },
    });

    // Capital outflow: remaining principal returned to depositor
    if (principalOutflow.greaterThan(0)) {
      await tx.capitalEntry.create({
        data: {
          flowType: 'OUTFLOW',
          source: 'DEPOSIT_WITHDRAWAL',
          sourceId: id,
          amount: principalOutflow,
          description: `Deposit withdrawn by depositor ${deposit.depositorId}`,
          createdById: actor.id,
        },
      });
    }

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'DEPOSIT_WITHDRAWN',
        targetId: id,
        metadata: { amount: deposit.amount, principalOutflow },
      },
    });

    return updated;
  });
}

export async function closeDeposit(id: string, data: CloseDepositInput, actor: Actor) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const deposit = await lockedActiveDeposit(tx, id, 'close');
    const principalOutflow = unreturnedPrincipal(deposit);

    const updated = await tx.deposit.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: now,
        // principalReturned stays payout-only — see withdrawDeposit.
        notes: data.notes ?? deposit.notes,
      },
    });

    // Capital outflow: remaining principal returned at maturity
    if (principalOutflow.greaterThan(0)) {
      await tx.capitalEntry.create({
        data: {
          flowType: 'OUTFLOW',
          source: 'DEPOSIT_WITHDRAWAL',
          sourceId: id,
          amount: principalOutflow,
          description: `Deposit matured and closed for depositor ${deposit.depositorId}`,
          createdById: actor.id,
        },
      });
    }

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'DEPOSIT_CLOSED',
        targetId: id,
        metadata: { amount: deposit.amount, principalOutflow, totalPayoutPaid: deposit.totalPayoutPaid },
      },
    });

    return updated;
  });
}

export async function recordPayout(id: string, data: RecordPayoutInput, actor: Actor) {
  const payoutAmount = new Decimal(data.amount);

  return prisma.$transaction(async (tx) => {
    const deposit = await lockedActiveDeposit(tx, id, 'record payout on');

    const paidAt = data.paidAt ?? new Date();
    if (deposit.payoutType === 'MATURITY_ONLY' && deposit.endDate != null && paidAt < deposit.endDate) {
      throw new AppError(
        'DEPOSIT_PAYOUT_BEFORE_MATURITY',
        'This deposit only pays out at maturity; it has not reached its end date yet.',
        409,
      );
    }

    // Recompute from the locked row so concurrent payouts can't clobber the totals.
    const newTotalPayoutPaid = new Decimal(deposit.totalPayoutPaid).plus(payoutAmount);
    const newPrincipalReturned = new Decimal(deposit.principalReturned).plus(
      new Decimal(data.principalPortion),
    );

    if (newPrincipalReturned.greaterThan(deposit.amount)) {
      throw new AppError(
        'PAYOUT_EXCEEDS_PRINCIPAL',
        'Cumulative principal payouts would exceed the deposit principal.',
        409,
      );
    }

    const payout = await tx.depositPayout.create({
      data: {
        depositId: id,
        amount: payoutAmount,
        principalPortion: new Decimal(data.principalPortion),
        returnPortion: new Decimal(data.returnPortion),
        paidAt,
        method: data.method,
        notes: data.notes,
      },
    });

    await tx.deposit.update({
      where: { id },
      data: {
        totalPayoutPaid: newTotalPayoutPaid,
        principalReturned: newPrincipalReturned,
      },
    });

    // Capital outflow: return paid out to depositor
    await tx.capitalEntry.create({
      data: {
        flowType: 'OUTFLOW',
        source: 'DEPOSIT_PAYOUT',
        sourceId: payout.id,
        amount: payoutAmount,
        description: `Payout recorded for deposit ${id}`,
        createdById: actor.id,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'DEPOSIT_PAYOUT_RECORDED',
        targetId: id,
        metadata: {
          payoutId: payout.id,
          amount: payoutAmount,
          returnPortion: data.returnPortion,
          principalPortion: data.principalPortion,
        },
      },
    });

    return payout;
  });
}

export async function reversePayout(
  depositId: string,
  payoutId: string,
  data: ReversePayoutInput,
  actor: Actor,
) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const deposit = await lockedActiveDeposit(tx, depositId, 'reverse a payout on');

    const payout = await tx.depositPayout.findFirst({ where: { id: payoutId, depositId } });
    if (!payout) throw new AppError('NOT_FOUND', 'Payout not found.', 404);
    if (payout.reversedAt) {
      throw new AppError('CONFLICT', 'Payout has already been reversed.', 409);
    }

    // LIFO-only, mirroring loan payment reversal. See docs/business-rules.md.
    const latest = await tx.depositPayout.findFirst({
      where: { depositId, reversedAt: null },
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
    });
    if (latest?.id !== payoutId) {
      throw new AppError(
        'CONFLICT',
        'Only the most recent payout can be reversed. Reverse newer payouts first.',
        409,
      );
    }

    await tx.deposit.update({
      where: { id: depositId },
      data: {
        totalPayoutPaid: new Decimal(deposit.totalPayoutPaid).minus(payout.amount),
        principalReturned: new Decimal(deposit.principalReturned).minus(payout.principalPortion),
      },
    });

    const reversed = await tx.depositPayout.update({
      where: { id: payoutId },
      data: { reversedAt: now, reversedById: actor.id, reversalReason: data.reason },
    });

    // Exclusion model: mark the original capital entry reversed (see docs/business-rules.md).
    await tx.capitalEntry.updateMany({
      where: { source: 'DEPOSIT_PAYOUT', sourceId: payoutId, reversedAt: null },
      data: { reversedAt: now, reversalReason: data.reason },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'DEPOSIT_PAYOUT_REVERSED',
        targetId: depositId,
        metadata: {
          payoutId,
          amount: payout.amount,
          principalPortion: payout.principalPortion,
          reason: data.reason,
        },
      },
    });

    return reversed;
  });
}

export async function softDeleteDeposit(id: string, actor: Actor) {
  const deposit = await prisma.deposit.findFirst({ where: { id, deletedAt: null } });
  if (!deposit) throw new AppError('NOT_FOUND', 'Deposit not found.', 404);

  if (deposit.status === 'ACTIVE') {
    throw new AppError('DEPOSIT_INVALID_STATE', 'Cannot delete an active deposit.', 409);
  }

  return prisma.$transaction(async (tx) => {
    const deleted = await tx.deposit.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'DEPOSIT_DELETED',
        targetId: id,
        metadata: { status: deposit.status },
      },
    });

    return deleted;
  });
}
