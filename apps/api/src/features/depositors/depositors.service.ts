import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';
import { normalizePhone } from '../../lib/phone.js';
import type {
  CreateDepositorInput,
  UpdateDepositorInput,
  ListDepositorsInput,
} from './depositors.schema.js';

interface Actor {
  id: string;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2002'
  );
}

export async function createDepositor(data: CreateDepositorInput, actor: Actor) {
  const existingEmail = await prisma.depositor.findFirst({
    where: { email: data.email, deletedAt: null },
  });
  if (existingEmail) {
    throw new AppError('CONFLICT', 'A depositor with this email already exists.', 409);
  }

  const phoneNormalized = normalizePhone(data.phone);

  try {
    return await prisma.$transaction(async (tx) => {
      const depositor = await tx.depositor.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          phoneNormalized,
          address: data.address,
          dateOfBirth: data.dateOfBirth,
          idType: data.idType,
          idNumber: data.idNumber,
          notes: data.notes,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: actor.id,
          category: 'AUDIT',
          action: 'DEPOSITOR_CREATED',
          targetId: depositor.id,
          metadata: { name: depositor.name, email: depositor.email },
        },
      });

      return depositor;
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new AppError('CONFLICT', 'A depositor with this email already exists.', 409);
    }
    throw err;
  }
}

export async function getDepositor(id: string) {
  const depositor = await prisma.depositor.findFirst({
    where: { id, deletedAt: null },
    include: {
      deposits: {
        where: { deletedAt: null },
        select: {
          id: true,
          amount: true,
          status: true,
          depositType: true,
          payoutType: true,
          termMonths: true,
          startDate: true,
          endDate: true,
          expectedReturnRate: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!depositor) throw new AppError('NOT_FOUND', 'Depositor not found.', 404);
  return depositor;
}

export async function listDepositors({ cursor, limit, search }: ListDepositorsInput) {
  const where = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { phoneNormalized: { contains: normalizePhone(search) } },
            { email: { contains: search } },
          ],
        }
      : {}),
  };

  const depositors = await prisma.depositor.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    take: limit + 1,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      idType: true,
      idNumber: true,
      createdAt: true,
      _count: { select: { deposits: { where: { deletedAt: null } } } },
    },
  });

  const hasMore = depositors.length > limit;
  const data = hasMore ? depositors.slice(0, limit) : depositors;
  const nextCursor = hasMore ? (data[data.length - 1]?.id ?? null) : null;

  return { data, meta: { nextCursor, hasMore, limit } };
}

export async function updateDepositor(id: string, data: UpdateDepositorInput, actor: Actor) {
  const depositor = await prisma.depositor.findFirst({ where: { id, deletedAt: null } });
  if (!depositor) throw new AppError('NOT_FOUND', 'Depositor not found.', 404);

  if (data.email && data.email !== depositor.email) {
    const conflict = await prisma.depositor.findFirst({
      where: { email: data.email, deletedAt: null, NOT: { id } },
    });
    if (conflict) throw new AppError('CONFLICT', 'A depositor with this email already exists.', 409);
  }

  const phoneNormalized = data.phone ? normalizePhone(data.phone) : undefined;

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.depositor.update({
        where: { id },
        data: { ...data, phoneNormalized },
      });

      await tx.activityLog.create({
        data: {
          userId: actor.id,
          category: 'AUDIT',
          action: 'DEPOSITOR_UPDATED',
          targetId: id,
          metadata: { fields: Object.keys(data) },
        },
      });

      return updated;
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new AppError('CONFLICT', 'A depositor with this email already exists.', 409);
    }
    throw err;
  }
}

export async function softDeleteDepositor(id: string, actor: Actor) {
  const depositor = await prisma.depositor.findFirst({ where: { id, deletedAt: null } });
  if (!depositor) throw new AppError('NOT_FOUND', 'Depositor not found.', 404);

  const activeDeposits = await prisma.deposit.count({
    where: { depositorId: id, deletedAt: null },
  });
  if (activeDeposits > 0) {
    throw new AppError('DEPOSITOR_HAS_DEPOSITS', 'Cannot delete a depositor with existing deposits.', 409);
  }

  return prisma.$transaction(async (tx) => {
    const deleted = await tx.depositor.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'DEPOSITOR_DELETED',
        targetId: id,
        metadata: { name: depositor.name, email: depositor.email },
      },
    });

    return deleted;
  });
}
