import { Decimal } from '@prisma/client/runtime/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    loan: { update: vi.fn() },
    loanProvisionEvent: { create: vi.fn() },
    activityLog: { create: vi.fn() },
  };
  return {
    tx,
    prisma: {
      loanInstallment: {
        findMany: vi.fn(),
        updateMany: vi.fn(),
      },
      loan: {
        findMany: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
    },
  };
});

vi.mock('../lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { markPastDueInstallmentsOverdue, runAutoDefaultJob } from './autoDefault.job.js';

describe('autoDefault.job', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.loanInstallment.findMany.mockResolvedValue([]);
    mocks.prisma.loanInstallment.updateMany.mockResolvedValue({ count: 0 });
    mocks.prisma.loan.findMany.mockResolvedValue([]);
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
            status: { in: ['ACTIVE', 'IN_ARREARS'] },
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

  describe('runAutoDefaultJob locked status recheck', () => {
    // A candidate scanned as ACTIVE can be paid off by a concurrent manual
    // transition before the job's transaction runs. The FOR UPDATE recheck must
    // skip it — no default, no provision event.
    it('skips a loan whose locked status is no longer collectible', async () => {
      const loan = {
        id: 'loan-1',
        remainingBalance: new Decimal(1000),
        loanInstallments: [{ dueDate: new Date('2026-01-01T00:00:00.000Z') }],
      };
      mocks.prisma.loan.findMany.mockResolvedValue([loan]);
      // Locked re-read shows the loan was paid between scan and transaction.
      mocks.tx.$queryRaw.mockResolvedValue([{ ...loan, status: 'PAID', deletedAt: null }]);

      await runAutoDefaultJob();

      expect(mocks.tx.loan.update).not.toHaveBeenCalled();
      expect(mocks.tx.loanProvisionEvent.create).not.toHaveBeenCalled();
    });

    it('defaults a loan still collectible under lock', async () => {
      const loan = {
        id: 'loan-2',
        remainingBalance: new Decimal(1000),
        loanInstallments: [{ dueDate: new Date('2026-01-01T00:00:00.000Z') }],
      };
      mocks.prisma.loan.findMany.mockResolvedValue([loan]);
      mocks.tx.$queryRaw.mockResolvedValue([{ ...loan, status: 'ACTIVE', deletedAt: null }]);

      await runAutoDefaultJob();

      expect(mocks.tx.loan.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'DEFAULTED' }) }),
      );
      expect(mocks.tx.loanProvisionEvent.create).toHaveBeenCalled();
    });
  });
});
