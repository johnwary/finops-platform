import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const tx = {
    borrower: {
      create: vi.fn(),
      update: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
  };

  return {
    tx,
    prisma: {
      borrower: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      loan: {
        count: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(tx)),
    },
  };
});

vi.mock('../../lib/prisma', () => ({ prisma: mocks.prisma }));

import {
  createBorrower,
  getBorrower,
  listBorrowers,
  softDeleteBorrower,
  updateBorrower,
} from './borrowers.service';

const actor = { id: 'user-1' };

const createInput = {
  firstName: 'Maria',
  middleName: undefined,
  lastName: 'Santos',
  email: 'maria@example.com',
  phone: '+639171234567',
  address: 'Makati City',
  dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
  gender: 'FEMALE' as const,
  idType: 'NATIONAL_ID' as const,
  idNumber: 'PH-12345',
  occupation: 'Accountant',
  incomeSource: 'EMPLOYMENT' as const,
  monthlyIncome: 50000,
  emergencyContactName: 'Juan Santos',
  emergencyContactPhone: '09171234568',
  notes: 'Preferred morning calls',
};

const borrower = {
  id: 'borrower-1',
  ...createInput,
  phoneNormalized: '09171234567',
  deletedAt: null,
  createdAt: new Date('2026-04-30T00:00:00.000Z'),
  updatedAt: new Date('2026-04-30T00:00:00.000Z'),
};

describe('borrowers.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.borrower.findFirst.mockResolvedValue(null);
    mocks.prisma.borrower.findMany.mockResolvedValue([]);
    mocks.prisma.loan.count.mockResolvedValue(0);
    mocks.tx.borrower.create.mockResolvedValue(borrower);
    mocks.tx.borrower.update.mockResolvedValue(borrower);
    mocks.tx.activityLog.create.mockResolvedValue({ id: 'log-1' });
  });

  describe('createBorrower', () => {
    it('creates a borrower and activity log in a transaction', async () => {
      const result = await createBorrower(createInput, actor);

      expect(result).toBe(borrower);
      expect(mocks.prisma.borrower.findFirst).toHaveBeenNthCalledWith(1, {
        where: { email: createInput.email, deletedAt: null },
      });
      expect(mocks.prisma.borrower.findFirst).toHaveBeenNthCalledWith(2, {
        where: { idNumber: createInput.idNumber, deletedAt: null },
      });
      expect(mocks.tx.borrower.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: createInput.email,
          phone: createInput.phone,
          phoneNormalized: '09171234567',
          monthlyIncome: expect.any(Object),
        }),
      });
      expect(mocks.tx.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: actor.id,
          category: 'AUDIT',
          action: 'BORROWER_CREATED',
          targetId: borrower.id,
        }),
      });
    });

    it('throws CONFLICT when an active borrower has the same email', async () => {
      mocks.prisma.borrower.findFirst
        .mockResolvedValueOnce({ id: 'existing-borrower' })
        .mockResolvedValueOnce(null);

      await expect(createBorrower(createInput, actor)).rejects.toMatchObject({
        code: 'CONFLICT',
        status: 409,
      });
      expect(mocks.tx.borrower.create).not.toHaveBeenCalled();
    });

    it('maps Prisma unique violations to CONFLICT', async () => {
      mocks.tx.borrower.create.mockRejectedValue({ code: 'P2002' });

      await expect(createBorrower(createInput, actor)).rejects.toMatchObject({
        code: 'CONFLICT',
        status: 409,
      });
    });
  });

  describe('getBorrower', () => {
    it('returns an active borrower with active loans', async () => {
      mocks.prisma.borrower.findFirst.mockResolvedValueOnce({
        ...borrower,
        loans: [{ id: 'loan-1' }],
      });

      const result = await getBorrower('borrower-1');

      expect(result).toMatchObject({ id: 'borrower-1', loans: [{ id: 'loan-1' }] });
      expect(mocks.prisma.borrower.findFirst).toHaveBeenCalledWith({
        where: { id: 'borrower-1', deletedAt: null },
        include: expect.objectContaining({
          loans: expect.objectContaining({
            where: { deletedAt: null },
          }),
        }),
      });
    });

    it('throws NOT_FOUND when the borrower is missing or soft deleted', async () => {
      await expect(getBorrower('missing-borrower')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        status: 404,
      });
    });
  });

  describe('listBorrowers', () => {
    it('lists active borrowers and returns cursor metadata', async () => {
      mocks.prisma.borrower.findMany.mockResolvedValue([
        { id: 'borrower-1' },
        { id: 'borrower-2' },
        { id: 'borrower-3' },
      ]);

      const result = await listBorrowers({ limit: 2, search: '9171234567' });

      expect(result).toEqual({
        data: [{ id: 'borrower-1' }, { id: 'borrower-2' }],
        meta: { nextCursor: 'borrower-2', hasMore: true, limit: 2 },
      });
      expect(mocks.prisma.borrower.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            OR: expect.arrayContaining([
              { phoneNormalized: { contains: '09171234567' } },
            ]),
          }),
          take: 3,
        }),
      );
    });

    it('matches comma-form full names across last, first, and middle name fields', async () => {
      await listBorrowers({ limit: 25, search: 'ypil, preciouss pulluan' });

      expect(mocks.prisma.borrower.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              {
                AND: [
                  { lastName: { contains: 'ypil', mode: 'insensitive' } },
                  {
                    OR: [
                      { firstName: { contains: 'preciouss', mode: 'insensitive' } },
                      { middleName: { contains: 'preciouss', mode: 'insensitive' } },
                    ],
                  },
                  {
                    OR: [
                      { firstName: { contains: 'pulluan', mode: 'insensitive' } },
                      { middleName: { contains: 'pulluan', mode: 'insensitive' } },
                    ],
                  },
                ],
              },
            ]),
          }),
        }),
      );
    });
  });

  describe('updateBorrower', () => {
    it('updates an active borrower and writes an activity log', async () => {
      mocks.prisma.borrower.findFirst.mockResolvedValueOnce(borrower);

      const result = await updateBorrower(
        'borrower-1',
        { phone: '9177654321', monthlyIncome: 60000 },
        actor,
      );

      expect(result).toBe(borrower);
      expect(mocks.tx.borrower.update).toHaveBeenCalledWith({
        where: { id: 'borrower-1' },
        data: expect.objectContaining({
          phone: '9177654321',
          phoneNormalized: '09177654321',
          monthlyIncome: expect.any(Object),
        }),
      });
      expect(mocks.tx.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'BORROWER_UPDATED',
          targetId: 'borrower-1',
          metadata: expect.objectContaining({ fields: ['phone', 'monthlyIncome'] }),
        }),
      });
    });

    it('checks changed email against active borrowers only', async () => {
      mocks.prisma.borrower.findFirst
        .mockResolvedValueOnce(borrower)
        .mockResolvedValueOnce({ id: 'borrower-2' });

      await expect(
        updateBorrower('borrower-1', { email: 'other@example.com' }, actor),
      ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
      expect(mocks.prisma.borrower.findFirst).toHaveBeenNthCalledWith(2, {
        where: { email: 'other@example.com', deletedAt: null, NOT: { id: 'borrower-1' } },
      });
    });

    it('maps Prisma unique violations to CONFLICT', async () => {
      mocks.prisma.borrower.findFirst.mockResolvedValueOnce(borrower);
      mocks.tx.borrower.update.mockRejectedValue({ code: 'P2002' });

      await expect(
        updateBorrower('borrower-1', { idNumber: 'PH-99999' }, actor),
      ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
    });
  });

  describe('softDeleteBorrower', () => {
    it('soft deletes a borrower with no active loans and writes an activity log', async () => {
      mocks.prisma.borrower.findFirst.mockResolvedValueOnce(borrower);

      await softDeleteBorrower('borrower-1', actor);

      expect(mocks.prisma.loan.count).toHaveBeenCalledWith({
        where: { borrowerId: 'borrower-1', deletedAt: null },
      });
      expect(mocks.tx.borrower.update).toHaveBeenCalledWith({
        where: { id: 'borrower-1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mocks.tx.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'BORROWER_DELETED',
          targetId: 'borrower-1',
        }),
      });
    });

    it('throws CONFLICT when the borrower has active loans', async () => {
      mocks.prisma.borrower.findFirst.mockResolvedValueOnce(borrower);
      mocks.prisma.loan.count.mockResolvedValueOnce(1);

      await expect(softDeleteBorrower('borrower-1', actor)).rejects.toMatchObject({
        code: 'BORROWER_HAS_LOANS',
        status: 409,
      });
      expect(mocks.tx.borrower.update).not.toHaveBeenCalled();
    });
  });
});
