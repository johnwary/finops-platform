import { Decimal } from '@prisma/client/runtime/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prisma: {
    loanInstallment: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('../lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { markPastDueInstallmentsOverdue } from './autoDefault.job.js';

describe('autoDefault.job', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.loanInstallment.findMany.mockResolvedValue([]);
    mocks.prisma.loanInstallment.updateMany.mockResolvedValue({ count: 0 });
  });

  describe('markPastDueInstallmentsOverdue', () => {
    it('marks only past-due scheduled installments with unpaid principal or interest', async () => {
      const now = new Date('2026-05-02T00:00:00.000Z');

      mocks.prisma.loanInstallment.findMany.mockResolvedValue([
        {
          id: 'unpaid-installment',
          principal: new Decimal(100),
          interest: new Decimal(10),
          allocations: [],
        },
        {
          id: 'fully-paid-installment',
          principal: new Decimal(100),
          interest: new Decimal(10),
          allocations: [
            {
              principalApplied: new Decimal(100),
              interestApplied: new Decimal(10),
            },
          ],
        },
      ]);
      mocks.prisma.loanInstallment.updateMany.mockResolvedValue({ count: 1 });

      const result = await markPastDueInstallmentsOverdue(now);

      expect(result).toBe(1);
      expect(mocks.prisma.loanInstallment.findMany).toHaveBeenCalledWith({
        where: {
          status: 'SCHEDULED',
          dueDate: { lt: now },
          loan: {
            status: 'ACTIVE',
            deletedAt: null,
          },
        },
        select: {
          id: true,
          principal: true,
          interest: true,
          allocations: {
            select: {
              principalApplied: true,
              interestApplied: true,
            },
          },
        },
      });
      expect(mocks.prisma.loanInstallment.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['unpaid-installment'] }, status: 'SCHEDULED' },
        data: { status: 'OVERDUE' },
      });
    });

    it('does not update when no installments are unpaid', async () => {
      const result = await markPastDueInstallmentsOverdue(
        new Date('2026-05-02T00:00:00.000Z'),
      );

      expect(result).toBe(0);
      expect(mocks.prisma.loanInstallment.updateMany).not.toHaveBeenCalled();
    });
  });
});
