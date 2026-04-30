import { Decimal } from '@prisma/client/runtime/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/response';

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2002'
  );
}
import type {
  CreateBorrowerInput,
  ListBorrowersInput,
  UpdateBorrowerInput,
} from './borrowers.schema';

interface Actor {
  id: string;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Normalize to 11-digit local format: 09XXXXXXXXX
  if (digits.startsWith('63') && digits.length === 12) return '0' + digits.slice(2);
  if (digits.length === 10) return '0' + digits;
  return digits;
}

export async function createBorrower(data: CreateBorrowerInput, actor: Actor) {
  const [existingEmail, existingId] = await Promise.all([
    prisma.borrower.findFirst({ where: { email: data.email, deletedAt: null } }),
    prisma.borrower.findFirst({ where: { idNumber: data.idNumber, deletedAt: null } }),
  ]);

  if (existingEmail) {
    throw new AppError('CONFLICT', 'A borrower with this email already exists.', 409);
  }
  if (existingId) {
    throw new AppError('CONFLICT', 'A borrower with this ID number already exists.', 409);
  }

  const phoneNormalized = normalizePhone(data.phone);

  try {
    return await prisma.$transaction(async (tx) => {
      const borrower = await tx.borrower.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          phoneNormalized,
          address: data.address,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          idType: data.idType,
          idNumber: data.idNumber,
          occupation: data.occupation,
          incomeSource: data.incomeSource,
          monthlyIncome: data.monthlyIncome != null ? new Decimal(data.monthlyIncome) : undefined,
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          notes: data.notes,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: actor.id,
          category: 'AUDIT',
          action: 'BORROWER_CREATED',
          targetId: borrower.id,
          metadata: { name: borrower.name, email: borrower.email },
        },
      });

      return borrower;
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new AppError('CONFLICT', 'A borrower with this email or ID number already exists.', 409);
    }
    throw err;
  }
}

export async function getBorrower(id: string) {
  const borrower = await prisma.borrower.findFirst({
    where: { id, deletedAt: null },
    include: {
      loans: {
        where: { deletedAt: null },
        select: {
          id: true,
          type: true,
          amount: true,
          status: true,
          startDate: true,
          endDate: true,
          remainingBalance: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!borrower) {
    throw new AppError('NOT_FOUND', 'Borrower not found.', 404);
  }

  return borrower;
}

export async function listBorrowers({ cursor, limit, search }: ListBorrowersInput) {
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

  const borrowers = await prisma.borrower.findMany({
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
      gender: true,
      idType: true,
      idNumber: true,
      incomeSource: true,
      createdAt: true,
      _count: { select: { loans: { where: { deletedAt: null } } } },
    },
  });

  const hasMore = borrowers.length > limit;
  const data = hasMore ? borrowers.slice(0, limit) : borrowers;
  const nextCursor = hasMore ? (data[data.length - 1]?.id ?? null) : null;

  return { data, meta: { nextCursor, hasMore, limit } };
}

export async function updateBorrower(id: string, data: UpdateBorrowerInput, actor: Actor) {
  const borrower = await prisma.borrower.findFirst({ where: { id, deletedAt: null } });

  if (!borrower) {
    throw new AppError('NOT_FOUND', 'Borrower not found.', 404);
  }

  if (data.email && data.email !== borrower.email) {
    const conflict = await prisma.borrower.findFirst({
      where: { email: data.email, deletedAt: null, NOT: { id } },
    });
    if (conflict) throw new AppError('CONFLICT', 'A borrower with this email already exists.', 409);
  }

  if (data.idNumber && data.idNumber !== borrower.idNumber) {
    const conflict = await prisma.borrower.findFirst({
      where: { idNumber: data.idNumber, deletedAt: null, NOT: { id } },
    });
    if (conflict) throw new AppError('CONFLICT', 'A borrower with this ID number already exists.', 409);
  }

  const phoneNormalized = data.phone ? normalizePhone(data.phone) : undefined;

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.borrower.update({
        where: { id },
        data: {
          ...data,
          phoneNormalized,
          monthlyIncome:
            data.monthlyIncome != null ? new Decimal(data.monthlyIncome) : undefined,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: actor.id,
          category: 'AUDIT',
          action: 'BORROWER_UPDATED',
          targetId: id,
          metadata: { fields: Object.keys(data) },
        },
      });

      return updated;
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new AppError('CONFLICT', 'A borrower with this email or ID number already exists.', 409);
    }
    throw err;
  }
}

export async function softDeleteBorrower(id: string, actor: Actor) {
  const borrower = await prisma.borrower.findFirst({ where: { id, deletedAt: null } });

  if (!borrower) {
    throw new AppError('NOT_FOUND', 'Borrower not found.', 404);
  }

  const activeLoans = await prisma.loan.count({
    where: { borrowerId: id, deletedAt: null },
  });

  if (activeLoans > 0) {
    throw new AppError(
      'BORROWER_HAS_LOANS',
      'Cannot delete a borrower with existing loans.',
      409,
    );
  }

  return prisma.$transaction(async (tx) => {
    const deleted = await tx.borrower.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'BORROWER_DELETED',
        targetId: id,
        metadata: { name: borrower.name, email: borrower.email },
      },
    });

    return deleted;
  });
}
