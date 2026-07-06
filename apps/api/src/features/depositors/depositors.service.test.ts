import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const tx = {
    depositor: {
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
      depositor: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      deposit: {
        count: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(tx)),
    },
  };
});

vi.mock('../../lib/prisma', () => ({ prisma: mocks.prisma }));

import {
  createDepositor,
  getDepositor,
  listDepositors,
  softDeleteDepositor,
  updateDepositor,
} from './depositors.service.js';

const actor = { id: 'user-1' };

const createInput = {
  name: 'Maria Santos',
  email: 'maria@example.com',
  phone: '+639171234567',
  address: 'Makati City',
  dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
  idType: 'NATIONAL_ID' as const,
  idNumber: 'PH-12345',
  notes: 'VIP',
};

const depositor = {
  id: 'depositor-1',
  ...createInput,
  phoneNormalized: '09171234567',
  deletedAt: null,
  createdAt: new Date('2026-04-30T00:00:00.000Z'),
  updatedAt: new Date('2026-04-30T00:00:00.000Z'),
};

describe('depositors.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.depositor.findFirst.mockResolvedValue(null);
    mocks.prisma.depositor.findMany.mockResolvedValue([]);
    mocks.prisma.deposit.count.mockResolvedValue(0);
    mocks.tx.depositor.create.mockResolvedValue(depositor);
    mocks.tx.depositor.update.mockResolvedValue(depositor);
    mocks.tx.activityLog.create.mockResolvedValue({ id: 'log-1' });
  });

  describe('createDepositor', () => {
    it('creates a depositor and activity log in a transaction', async () => {
      const result = await createDepositor(createInput, actor);

      expect(result).toBe(depositor);
      expect(mocks.prisma.depositor.findFirst).toHaveBeenCalledWith({
        where: { email: createInput.email, deletedAt: null },
      });
      expect(mocks.tx.depositor.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: createInput.email,
          phone: createInput.phone,
          phoneNormalized: '09171234567',
        }),
      });
      expect(mocks.tx.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: actor.id,
          category: 'AUDIT',
          action: 'DEPOSITOR_CREATED',
          targetId: depositor.id,
        }),
      });
    });

    it('throws CONFLICT when an active depositor has the same email', async () => {
      mocks.prisma.depositor.findFirst.mockResolvedValueOnce({ id: 'existing' });

      await expect(createDepositor(createInput, actor)).rejects.toMatchObject({
        code: 'CONFLICT',
        status: 409,
      });
      expect(mocks.tx.depositor.create).not.toHaveBeenCalled();
    });

    it('maps Prisma unique violations to CONFLICT', async () => {
      mocks.tx.depositor.create.mockRejectedValue({ code: 'P2002' });

      await expect(createDepositor(createInput, actor)).rejects.toMatchObject({
        code: 'CONFLICT',
        status: 409,
      });
    });
  });

  describe('getDepositor', () => {
    it('returns an active depositor', async () => {
      mocks.prisma.depositor.findFirst.mockResolvedValueOnce({ ...depositor, deposits: [] });

      const result = await getDepositor('depositor-1');

      expect(result).toMatchObject({ id: 'depositor-1' });
      expect(mocks.prisma.depositor.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'depositor-1', deletedAt: null } }),
      );
    });

    it('throws NOT_FOUND when missing or soft deleted', async () => {
      await expect(getDepositor('missing')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        status: 404,
      });
    });
  });

  describe('listDepositors', () => {
    it('filters to active depositors and returns cursor metadata', async () => {
      mocks.prisma.depositor.findMany.mockResolvedValue([
        { id: 'depositor-1', _count: { deposits: 0 } },
        { id: 'depositor-2', _count: { deposits: 0 } },
        { id: 'depositor-3', _count: { deposits: 0 } },
      ]);

      const result = await listDepositors({ limit: 2 });

      expect(result.data).toEqual([
        { id: 'depositor-1', depositCount: 0 },
        { id: 'depositor-2', depositCount: 0 },
      ]);
      expect(result.meta).toEqual({ nextCursor: 'depositor-2', hasMore: true, limit: 2 });
      expect(mocks.prisma.depositor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null }, take: 3 }),
      );
    });

    it('returns empty data with hasMore false when none match', async () => {
      const result = await listDepositors({ limit: 25 });

      expect(result).toEqual({
        data: [],
        meta: { nextCursor: null, hasMore: false, limit: 25 },
      });
    });
  });

  describe('updateDepositor', () => {
    it('updates an active depositor and writes an activity log', async () => {
      mocks.prisma.depositor.findFirst.mockResolvedValueOnce(depositor);

      const result = await updateDepositor('depositor-1', { phone: '9177654321' }, actor);

      expect(result).toBe(depositor);
      expect(mocks.tx.depositor.update).toHaveBeenCalledWith({
        where: { id: 'depositor-1' },
        data: expect.objectContaining({ phone: '9177654321', phoneNormalized: '09177654321' }),
      });
      expect(mocks.tx.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'DEPOSITOR_UPDATED', targetId: 'depositor-1' }),
      });
    });

    it('throws NOT_FOUND when the depositor is missing', async () => {
      await expect(
        updateDepositor('missing', { name: 'X' }, actor),
      ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
      expect(mocks.tx.depositor.update).not.toHaveBeenCalled();
    });

    it('checks a changed email against other active depositors only', async () => {
      mocks.prisma.depositor.findFirst
        .mockResolvedValueOnce(depositor)
        .mockResolvedValueOnce({ id: 'depositor-2' });

      await expect(
        updateDepositor('depositor-1', { email: 'other@example.com' }, actor),
      ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
      expect(mocks.prisma.depositor.findFirst).toHaveBeenNthCalledWith(2, {
        where: { email: 'other@example.com', deletedAt: null, NOT: { id: 'depositor-1' } },
      });
      expect(mocks.tx.depositor.update).not.toHaveBeenCalled();
    });

    it('maps Prisma unique violations to CONFLICT', async () => {
      mocks.prisma.depositor.findFirst.mockResolvedValueOnce(depositor);
      mocks.tx.depositor.update.mockRejectedValue({ code: 'P2002' });

      await expect(
        updateDepositor('depositor-1', { name: 'X' }, actor),
      ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
    });
  });

  describe('softDeleteDepositor', () => {
    it('soft deletes a depositor with no deposits and writes an activity log', async () => {
      mocks.prisma.depositor.findFirst.mockResolvedValueOnce(depositor);

      await softDeleteDepositor('depositor-1', actor);

      expect(mocks.prisma.deposit.count).toHaveBeenCalledWith({
        where: { depositorId: 'depositor-1', deletedAt: null },
      });
      expect(mocks.tx.depositor.update).toHaveBeenCalledWith({
        where: { id: 'depositor-1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mocks.tx.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'DEPOSITOR_DELETED', targetId: 'depositor-1' }),
      });
    });

    it('throws NOT_FOUND when already soft deleted', async () => {
      await expect(softDeleteDepositor('depositor-1', actor)).rejects.toMatchObject({
        code: 'NOT_FOUND',
        status: 404,
      });
      expect(mocks.tx.depositor.update).not.toHaveBeenCalled();
    });

    it('throws DEPOSITOR_HAS_DEPOSITS when the depositor has deposits', async () => {
      mocks.prisma.depositor.findFirst.mockResolvedValueOnce(depositor);
      mocks.prisma.deposit.count.mockResolvedValueOnce(1);

      await expect(softDeleteDepositor('depositor-1', actor)).rejects.toMatchObject({
        code: 'DEPOSITOR_HAS_DEPOSITS',
        status: 409,
      });
      expect(mocks.tx.depositor.update).not.toHaveBeenCalled();
    });
  });
});
