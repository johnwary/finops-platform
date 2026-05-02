import { Decimal } from '@prisma/client/runtime/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const tx = {
    loanInstallment: {
      findMany: vi.fn(),
    },
    loanPayment: {
      create: vi.fn(),
    },
    loanPaymentAllocation: {
      createMany: vi.fn(),
    },
    loan: {
      update: vi.fn(),
    },
    capitalEntry: {
      create: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
  };

  return {
    tx,
    prisma: {
      loan: {
        findFirst: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(tx)),
    },
  };
});

vi.mock('../../lib/prisma', () => ({ prisma: mocks.prisma }));

import { recordPayment } from './loans.service';

const actor = { id: 'user-1' };

const activeLoan = {
  id: 'loan-1',
  status: 'ACTIVE',
  locked: false,
  totalPaid: new Decimal(0),
  remainingBalance: new Decimal(1000),
};

describe('loans.service recordPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.loan.findFirst.mockResolvedValue(activeLoan);
    mocks.tx.loanPayment.create.mockResolvedValue({ id: 'payment-1' });
    mocks.tx.loan.update.mockResolvedValue({});
    mocks.tx.capitalEntry.create.mockResolvedValue({});
    mocks.tx.activityLog.create.mockResolvedValue({});
    mocks.tx.loanPaymentAllocation.createMany.mockResolvedValue({ count: 0 });
  });

  it('auto-allocates payment to oldest installments, interest before principal', async () => {
    mocks.tx.loanInstallment.findMany.mockResolvedValue([
      {
        id: 'installment-1',
        principal: new Decimal(100),
        interest: new Decimal(20),
        allocations: [],
      },
      {
        id: 'installment-2',
        principal: new Decimal(100),
        interest: new Decimal(20),
        allocations: [],
      },
    ]);

    await recordPayment(
      'loan-1',
      { amount: 180, method: 'CASH', reference: 'OR-1' },
      actor,
    );

    expect(mocks.tx.loanPayment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        loanId: 'loan-1',
        amount: expect.any(Decimal),
        principalPortion: expect.any(Decimal),
        interestPortion: expect.any(Decimal),
        penalties: expect.any(Decimal),
        method: 'CASH',
        reference: 'OR-1',
      }),
    });

    const paymentData = mocks.tx.loanPayment.create.mock.calls[0][0].data;
    expect(paymentData.principalPortion.toFixed(2)).toBe('140.00');
    expect(paymentData.interestPortion.toFixed(2)).toBe('40.00');

    const allocationRows = mocks.tx.loanPaymentAllocation.createMany.mock.calls[0][0].data;
    expect(allocationRows).toHaveLength(2);
    expect(allocationRows[0].installmentId).toBe('installment-1');
    expect(allocationRows[0].interestApplied.toFixed(2)).toBe('20.00');
    expect(allocationRows[0].principalApplied.toFixed(2)).toBe('100.00');
    expect(allocationRows[1].installmentId).toBe('installment-2');
    expect(allocationRows[1].interestApplied.toFixed(2)).toBe('20.00');
    expect(allocationRows[1].principalApplied.toFixed(2)).toBe('40.00');

    expect(mocks.tx.loan.update).toHaveBeenCalledWith({
      where: { id: 'loan-1' },
      data: expect.objectContaining({
        totalPaid: expect.any(Decimal),
        remainingBalance: expect.any(Decimal),
      }),
    });
    const loanUpdate = mocks.tx.loan.update.mock.calls[0][0].data;
    expect(loanUpdate.remainingBalance.toFixed(2)).toBe('860.00');
  });

  it('rejects payments above outstanding scheduled receivable', async () => {
    mocks.tx.loanInstallment.findMany.mockResolvedValue([
      {
        id: 'installment-1',
        principal: new Decimal(100),
        interest: new Decimal(20),
        allocations: [],
      },
    ]);

    await expect(
      recordPayment('loan-1', { amount: 121, method: 'CASH' }, actor),
    ).rejects.toMatchObject({
      code: 'PAYMENT_EXCEEDS_RECEIVABLE',
      status: 409,
    });

    expect(mocks.tx.loanPayment.create).not.toHaveBeenCalled();
    expect(mocks.tx.loanPaymentAllocation.createMany).not.toHaveBeenCalled();
  });
});
