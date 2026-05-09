import { Decimal } from '@prisma/client/runtime/client';
import { addMonths } from 'date-fns';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';
import type {
  CreateDepositInput,
  UpdateDepositInput,
  WithdrawDepositInput,
  CloseDepositInput,
  RecordPayoutInput,
  ListDepositsInput,
} from './deposits.schema.js';

interface Actor {
  id: string;
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
    orderBy: { createdAt: 'desc' },
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

export async function withdrawDeposit(id: string, data: WithdrawDepositInput, actor: Actor) {
  const deposit = await prisma.deposit.findFirst({ where: { id, deletedAt: null } });
  if (!deposit) throw new AppError('NOT_FOUND', 'Deposit not found.', 404);

  if (deposit.status !== 'ACTIVE') {
    throw new AppError(
      'DEPOSIT_INVALID_STATE',
      `Cannot withdraw a deposit with status ${deposit.status}.`,
      409,
    );
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const updated = await tx.deposit.update({
      where: { id },
      data: {
        status: 'WITHDRAWN',
        hasBeenWithdrawn: true,
        withdrawnAt: now,
        notes: data.notes ?? deposit.notes,
      },
    });

    // Capital outflow: principal returned to depositor
    await tx.capitalEntry.create({
      data: {
        flowType: 'OUTFLOW',
        source: 'DEPOSIT_WITHDRAWAL',
        sourceId: id,
        amount: deposit.amount,
        description: `Deposit withdrawn by depositor ${deposit.depositorId}`,
        createdById: actor.id,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'DEPOSIT_WITHDRAWN',
        targetId: id,
        metadata: { amount: deposit.amount },
      },
    });

    return updated;
  });
}

export async function closeDeposit(id: string, data: CloseDepositInput, actor: Actor) {
  const deposit = await prisma.deposit.findFirst({ where: { id, deletedAt: null } });
  if (!deposit) throw new AppError('NOT_FOUND', 'Deposit not found.', 404);

  if (deposit.status !== 'ACTIVE') {
    throw new AppError(
      'DEPOSIT_INVALID_STATE',
      `Cannot close a deposit with status ${deposit.status}.`,
      409,
    );
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const updated = await tx.deposit.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: now,
        notes: data.notes ?? deposit.notes,
      },
    });

    // Capital outflow: principal returned at maturity
    await tx.capitalEntry.create({
      data: {
        flowType: 'OUTFLOW',
        source: 'DEPOSIT_WITHDRAWAL',
        sourceId: id,
        amount: deposit.amount,
        description: `Deposit matured and closed for depositor ${deposit.depositorId}`,
        createdById: actor.id,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'DEPOSIT_CLOSED',
        targetId: id,
        metadata: { amount: deposit.amount, totalPayoutPaid: deposit.totalPayoutPaid },
      },
    });

    return updated;
  });
}

export async function recordPayout(id: string, data: RecordPayoutInput, actor: Actor) {
  const deposit = await prisma.deposit.findFirst({ where: { id, deletedAt: null } });
  if (!deposit) throw new AppError('NOT_FOUND', 'Deposit not found.', 404);

  if (deposit.status !== 'ACTIVE') {
    throw new AppError(
      'DEPOSIT_INVALID_STATE',
      `Cannot record payout on a deposit with status ${deposit.status}.`,
      409,
    );
  }

  const payoutAmount = new Decimal(data.amount);
  const newTotalPayoutPaid = new Decimal(deposit.totalPayoutPaid).plus(payoutAmount);
  const newPrincipalReturned = new Decimal(deposit.principalReturned).plus(
    new Decimal(data.principalPortion),
  );

  return prisma.$transaction(async (tx) => {
    const payout = await tx.depositPayout.create({
      data: {
        depositId: id,
        amount: payoutAmount,
        principalPortion: new Decimal(data.principalPortion),
        returnPortion: new Decimal(data.returnPortion),
        paidAt: data.paidAt ?? new Date(),
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
