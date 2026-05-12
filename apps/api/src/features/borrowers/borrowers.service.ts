import { Decimal } from '@prisma/client/runtime/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';
import type {
  CreateBorrowerInput,
  ListBorrowerActivityInput,
  ListBorrowersInput,
  UpdateBorrowerInput,
} from './borrowers.schema.js';

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2002'
  );
}

interface Actor {
  id: string;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('63') && digits.length === 12) return '0' + digits.slice(2);
  if (digits.length === 10) return '0' + digits;
  return digits;
}

function formatBorrowerName(b: { firstName: string; middleName?: string | null; lastName: string }): string {
  const first = b.middleName ? `${b.firstName} ${b.middleName}` : b.firstName;
  return `${b.lastName}, ${first}`;
}

function buildNameSearchClauses(search: string) {
  const contains = (value: string) => ({ contains: value, mode: 'insensitive' as const });
  const tokens = search
    .replace(',', ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const clauses: object[] = [
    { firstName: contains(search) },
    { middleName: contains(search) },
    { lastName: contains(search) },
  ];

  if (tokens.length > 1 && !search.includes(',')) {
    clauses.push({
      AND: tokens.map((token) => ({
        OR: [
          { firstName: contains(token) },
          { middleName: contains(token) },
          { lastName: contains(token) },
        ],
      })),
    });
  }

  if (search.includes(',')) {
    const [lastNamePart, givenNamePart] = search.split(',', 2).map((part) => part.trim());
    const givenNameTokens = givenNamePart
      ? givenNamePart.split(/\s+/).map((token) => token.trim()).filter(Boolean)
      : [];

    if (lastNamePart && givenNameTokens.length) {
      clauses.push({
        AND: [
          { lastName: contains(lastNamePart) },
          ...givenNameTokens.map((token) => ({
            OR: [
              { firstName: contains(token) },
              { middleName: contains(token) },
            ],
          })),
        ],
      });
    }
  }

  return clauses;
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
          firstName: data.firstName,
          middleName: data.middleName,
          lastName: data.lastName,
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
          metadata: {
            name: formatBorrowerName(borrower),
            firstName: borrower.firstName,
            middleName: borrower.middleName,
            lastName: borrower.lastName,
            email: borrower.email,
          },
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
          applicationDate: true,
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

export async function listBorrowers({ cursor, limit, search, deleted }: ListBorrowersInput) {
  const where = {
    deletedAt: deleted ? { not: null } : null,
    ...(search
      ? {
          OR: [
            ...buildNameSearchClauses(search),
            { email: { contains: search, mode: 'insensitive' as const } },
            ...(normalizePhone(search)
              ? [{ phoneNormalized: { contains: normalizePhone(search) } }]
              : []),
          ],
        }
      : {}),
  };

  const borrowers = await prisma.borrower.findMany({
    where,
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { createdAt: 'desc' }],
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    take: limit + 1,
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
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
          firstName: data.firstName,
          middleName: data.middleName,
          lastName: data.lastName,
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
          monthlyIncome:
            data.monthlyIncome != null ? new Decimal(data.monthlyIncome) : undefined,
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          notes: data.notes,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: actor.id,
          category: 'AUDIT',
          action: 'BORROWER_UPDATED',
          targetId: id,
          metadata: {
            name: formatBorrowerName(updated),
            firstName: updated.firstName,
            middleName: updated.middleName,
            lastName: updated.lastName,
            email: updated.email,
            fields: Object.keys(data),
          },
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
        metadata: {
          name: formatBorrowerName(borrower),
          firstName: borrower.firstName,
          middleName: borrower.middleName,
          lastName: borrower.lastName,
          email: borrower.email,
        },
      },
    });

    return deleted;
  });
}

export async function listBorrowerActivity(
  id: string,
  { cursor, limit }: ListBorrowerActivityInput,
  actor: { role?: string | null },
) {
  const borrowerWhere =
    actor.role === 'admin' ? { id } : { id, deletedAt: null };

  const borrower = await prisma.borrower.findFirst({ where: borrowerWhere });
  if (!borrower) {
    throw new AppError('NOT_FOUND', 'Borrower not found.', 404);
  }

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

export async function restoreBorrower(id: string, actor: Actor) {
  const borrower = await prisma.borrower.findFirst({
    where: { id, deletedAt: { not: null } },
  });

  if (!borrower) {
    throw new AppError('NOT_FOUND', 'Deleted borrower not found.', 404);
  }

  const [emailConflict, idConflict] = await Promise.all([
    prisma.borrower.findFirst({ where: { email: borrower.email, deletedAt: null } }),
    prisma.borrower.findFirst({ where: { idNumber: borrower.idNumber, deletedAt: null } }),
  ]);

  if (emailConflict) {
    throw new AppError('CONFLICT', 'An active borrower with this email already exists.', 409);
  }
  if (idConflict) {
    throw new AppError('CONFLICT', 'An active borrower with this ID number already exists.', 409);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const restored = await tx.borrower.update({
        where: { id },
        data: { deletedAt: null },
      });

      await tx.activityLog.create({
        data: {
          userId: actor.id,
          category: 'AUDIT',
          action: 'BORROWER_RESTORED',
          targetId: id,
          metadata: {
            name: formatBorrowerName(restored),
            firstName: restored.firstName,
            middleName: restored.middleName,
            lastName: restored.lastName,
            email: restored.email,
          },
        },
      });

      return restored;
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new AppError(
        'CONFLICT',
        'Cannot restore borrower because an active borrower with this email or ID number already exists.',
        409,
      );
    }
    throw err;
  }
}
