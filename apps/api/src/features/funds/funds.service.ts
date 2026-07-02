import { Decimal } from '@prisma/client/runtime/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';
import type { BusinessFund, Prisma } from '../../generated/prisma/client.js';
import type { CreateFundInput, WithdrawFundInput, ListFundsInput } from './funds.schema.js';

interface Actor {
  id: string;
}

async function lockedActiveFund(tx: Prisma.TransactionClient, id: string): Promise<BusinessFund> {
  const rows = await tx.$queryRaw<BusinessFund[]>`
    SELECT * FROM "BusinessFund" WHERE id = ${id} FOR UPDATE
  `;
  const fund = rows[0];
  if (!fund) throw new AppError('NOT_FOUND', 'Business fund entry not found.', 404);
  if (fund.status !== 'ACTIVE') {
    throw new AppError('FUND_INVALID_STATE', 'Fund entry has already been withdrawn.', 409);
  }
  return fund;
}

export async function createFund(data: CreateFundInput, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const fund = await tx.businessFund.create({
      data: {
        amount: new Decimal(data.amount),
        dateAdded: data.dateAdded,
        remarks: data.remarks,
      },
    });

    // Capital inflow: owner capital enters the business
    await tx.capitalEntry.create({
      data: {
        flowType: 'INFLOW',
        source: 'BUSINESS_CAPITAL',
        sourceId: fund.id,
        amount: new Decimal(data.amount),
        description: data.remarks ?? 'Business capital added',
        createdById: actor.id,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'FUND_ADDED',
        targetId: fund.id,
        metadata: { amount: fund.amount, dateAdded: fund.dateAdded },
      },
    });

    return fund;
  });
}

export async function withdrawFund(id: string, data: WithdrawFundInput, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const fund = await lockedActiveFund(tx, id);

    const updated = await tx.businessFund.update({
      where: { id },
      data: {
        status: 'WITHDRAWN',
        remarks: data.remarks ?? fund.remarks,
      },
    });

    // Capital outflow: owner capital leaves the business
    await tx.capitalEntry.create({
      data: {
        flowType: 'OUTFLOW',
        source: 'BUSINESS_CAPITAL',
        sourceId: id,
        amount: fund.amount,
        description: data.remarks ?? 'Business capital withdrawn',
        createdById: actor.id,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'FUND_WITHDRAWN',
        targetId: id,
        metadata: { amount: fund.amount },
      },
    });

    return updated;
  });
}

export async function listFunds({ cursor, limit, status }: ListFundsInput) {
  const funds = await prisma.businessFund.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ dateAdded: 'desc' }, { id: 'desc' }],
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    take: limit + 1,
  });

  const hasMore = funds.length > limit;
  const data = hasMore ? funds.slice(0, limit) : funds;
  const nextCursor = hasMore ? (data[data.length - 1]?.id ?? null) : null;

  return { data, meta: { nextCursor, hasMore, limit } };
}
