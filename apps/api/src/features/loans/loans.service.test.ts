import { Decimal } from '@prisma/client/runtime/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const tx = {
    loanInstallment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      createMany: vi.fn(),
    },
    loanPayment: {
      create: vi.fn(),
    },
    loanPaymentAllocation: {
      createMany: vi.fn(),
    },
    loanProvisionEvent: {
      create: vi.fn(),
    },
    loan: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    capitalEntry: {
      create: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
    $queryRaw: vi.fn(),
  };

  return {
    tx,
    prisma: {
      loan: {
        findFirst: vi.fn(),
      },
      loanInstallment: {
        findFirst: vi.fn(),
      },
      borrower: {
        findFirst: vi.fn(),
      },
      activityLog: {
        findMany: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(tx)),
    },
  };
});

vi.mock('../../lib/prisma', () => ({ prisma: mocks.prisma }));

import {
  approveLoan,
  cancelLoan,
  createLoan,
  defaultLoan,
  disburseLoan,
  markLoanArrears,
  markLoanCurrent,
  recordPayment,
  restoreLoan,
  softDeleteLoan,
  writeOffLoan,
} from './loans.service.js';

const actor = { id: 'user-1' };

const baseLoan = {
  id: 'loan-1',
  borrowerId: 'borrower-1',
  status: 'PENDING',
  locked: false,
  totalPaid: new Decimal(0),
  remainingBalance: new Decimal(1000),
  amount: new Decimal(1000),
  interestRate: new Decimal(0.03),
  termMonths: 3,
  paymentFrequency: 'MONTHLY',
  repaymentStructure: 'AMORTIZING',
  notes: null,
};

const activeLoan = { ...baseLoan, status: 'ACTIVE' };
const approvedLoan = { ...baseLoan, status: 'APPROVED' };
const arrearsLoan = { ...baseLoan, status: 'IN_ARREARS' };
const defaultedLoan = { ...baseLoan, status: 'DEFAULTED' };
const canceledLoan = { ...baseLoan, status: 'CANCELED' };

// ── createLoan ────────────────────────────────────────────────────────────────

describe('loans.service createLoan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.loan.create.mockResolvedValue({ ...baseLoan });
    mocks.tx.activityLog.create.mockResolvedValue({});
  });

  it('throws NOT_FOUND when borrower does not exist', async () => {
    mocks.prisma.borrower.findFirst.mockResolvedValue(null);

    await expect(
      createLoan(
        {
          borrowerId: 'borrower-1',
          type: 'PERSONAL',
          amount: 1000,
          interestRate: 0.03,
          termMonths: 3,
          applicationDate: new Date('2024-01-01'),
          paymentFrequency: 'MONTHLY',
          repaymentStructure: 'AMORTIZING',
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });

    expect(mocks.tx.loan.create).not.toHaveBeenCalled();
  });

  it('creates loan and writes audit log when borrower exists', async () => {
    mocks.prisma.borrower.findFirst.mockResolvedValue({ id: 'borrower-1' });

    const result = await createLoan(
      {
        borrowerId: 'borrower-1',
        type: 'PERSONAL',
        amount: 1000,
        interestRate: 0.03,
        termMonths: 3,
        applicationDate: new Date('2024-01-01'),
        paymentFrequency: 'MONTHLY',
        repaymentStructure: 'AMORTIZING',
      },
      actor,
    );

    expect(mocks.tx.loan.create).toHaveBeenCalledOnce();
    expect(mocks.tx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'LOAN_CREATED' }) }),
    );
    expect(result).toMatchObject({ id: 'loan-1' });
  });
});

// ── approveLoan ───────────────────────────────────────────────────────────────

describe('loans.service approveLoan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.loan.update.mockResolvedValue({ ...approvedLoan });
    mocks.tx.activityLog.create.mockResolvedValue({});
  });

  it('throws NOT_FOUND when loan does not exist', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(null);

    await expect(approveLoan('loan-1', {}, actor)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('throws LOAN_INVALID_STATE when loan is not PENDING', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(activeLoan);

    await expect(approveLoan('loan-1', {}, actor)).rejects.toMatchObject({
      code: 'LOAN_INVALID_STATE',
      status: 409,
    });

    expect(mocks.tx.loan.update).not.toHaveBeenCalled();
  });

  it('updates status to APPROVED and writes audit log', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(baseLoan);

    const result = await approveLoan('loan-1', {}, actor);

    expect(mocks.tx.loan.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED' }) }),
    );
    expect(mocks.tx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'LOAN_APPROVED' }) }),
    );
    expect(result).toMatchObject({ status: 'APPROVED' });
  });
});

// ── disburseLoan ──────────────────────────────────────────────────────────────

describe('loans.service disburseLoan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.loan.update.mockResolvedValue({ ...activeLoan });
    mocks.tx.loanInstallment.createMany.mockResolvedValue({ count: 3 });
    mocks.tx.capitalEntry.create.mockResolvedValue({});
    mocks.tx.activityLog.create.mockResolvedValue({});
  });

  it('throws LOAN_INVALID_STATE when loan is not APPROVED', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(activeLoan);

    await expect(
      disburseLoan('loan-1', { disbursementMethod: 'CASH' }, actor),
    ).rejects.toMatchObject({ code: 'LOAN_INVALID_STATE', status: 409 });

    expect(mocks.tx.loanInstallment.createMany).not.toHaveBeenCalled();
  });

  it('generates correct number of monthly amortizing installments', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(approvedLoan);

    await disburseLoan(
      'loan-1',
      { disbursementMethod: 'CASH', disbursedAt: new Date('2024-01-01') },
      actor,
    );

    const installments = mocks.tx.loanInstallment.createMany.mock.calls[0][0].data;
    expect(installments).toHaveLength(3);
    // Amortizing: P+I sum equals principal (within rounding tolerance)
    const totalPrincipal = installments.reduce(
      (sum: Decimal, i: { principal: Decimal }) => sum.plus(i.principal),
      new Decimal(0),
    );
    expect(totalPrincipal.toNumber()).toBeCloseTo(1000, 0);
  });

  it('generates interest-only installments with principal lump at end', async () => {
    const interestOnlyLoan = {
      ...approvedLoan,
      repaymentStructure: 'INTEREST_ONLY',
    };
    mocks.prisma.loan.findFirst.mockResolvedValue(interestOnlyLoan);

    await disburseLoan(
      'loan-1',
      { disbursementMethod: 'CASH', disbursedAt: new Date('2024-01-01') },
      actor,
    );

    const installments = mocks.tx.loanInstallment.createMany.mock.calls[0][0].data;
    expect(installments).toHaveLength(3);
    // First installments: zero principal
    expect(installments[0].principal.toFixed(2)).toBe('0.00');
    // Last installment: full principal
    expect(installments[2].principal.toFixed(2)).toBe('1000.00');
    // All interest equal (flat rate)
    expect(installments[0].interest.toFixed(2)).toBe(installments[1].interest.toFixed(2));
  });

  it('writes capital outflow and audit log', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(approvedLoan);

    await disburseLoan('loan-1', { disbursementMethod: 'GCASH' }, actor);

    expect(mocks.tx.capitalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ flowType: 'OUTFLOW', source: 'LOAN_DISBURSEMENT' }),
      }),
    );
    expect(mocks.tx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'LOAN_DISBURSED' }) }),
    );
  });
});

// ── cancelLoan ────────────────────────────────────────────────────────────────

describe('loans.service cancelLoan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.loan.update.mockResolvedValue({ ...baseLoan, status: 'CANCELED' });
    mocks.tx.activityLog.create.mockResolvedValue({});
  });

  it('throws LOAN_INVALID_STATE when loan is ACTIVE', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(activeLoan);

    await expect(
      cancelLoan('loan-1', { cancellationReason: 'test' }, actor),
    ).rejects.toMatchObject({ code: 'LOAN_INVALID_STATE', status: 409 });
  });

  it('cancels a PENDING loan', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(baseLoan);

    const result = await cancelLoan('loan-1', { cancellationReason: 'Duplicate application' }, actor);

    expect(mocks.tx.loan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CANCELED', cancellationReason: 'Duplicate application' }),
      }),
    );
    expect(result).toMatchObject({ status: 'CANCELED' });
  });

  it('cancels an APPROVED loan', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(approvedLoan);

    await cancelLoan('loan-1', { cancellationReason: 'Client withdrew' }, actor);

    expect(mocks.tx.loan.update).toHaveBeenCalledOnce();
  });
});

// ── recordPayment ─────────────────────────────────────────────────────────────

describe('loans.service recordPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.loan.findFirst.mockResolvedValue(activeLoan);
    mocks.prisma.loanInstallment.findFirst.mockResolvedValue(null);
    mocks.tx.loanPayment.create.mockResolvedValue({ id: 'payment-1' });
    mocks.tx.loanInstallment.findFirst.mockResolvedValue(null);
    mocks.tx.loanInstallment.updateMany.mockResolvedValue({ count: 0 });
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

  it('throws LOAN_INVALID_STATE when loan is not ACTIVE or IN_ARREARS', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(canceledLoan);

    await expect(
      recordPayment('loan-1', { amount: 100, method: 'CASH' }, actor),
    ).rejects.toMatchObject({ code: 'LOAN_INVALID_STATE', status: 409 });
  });

  it('throws LOAN_LOCKED when loan is locked', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue({ ...activeLoan, locked: true });

    await expect(
      recordPayment('loan-1', { amount: 100, method: 'CASH' }, actor),
    ).rejects.toMatchObject({ code: 'LOAN_LOCKED', status: 409 });
  });

  it('throws PAYMENT_BELOW_MINIMUM when payment is less than outstanding interest', async () => {
    mocks.prisma.loanInstallment.findFirst.mockResolvedValue({
      id: 'installment-1',
      interest: new Decimal(50),
      allocations: [],
    });

    await expect(
      recordPayment('loan-1', { amount: 30, method: 'CASH' }, actor),
    ).rejects.toMatchObject({ code: 'PAYMENT_BELOW_MINIMUM', status: 409 });
  });

  it('accepts payment on IN_ARREARS loan', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(arrearsLoan);
    mocks.tx.loanInstallment.findMany.mockResolvedValue([
      {
        id: 'installment-1',
        principal: new Decimal(100),
        interest: new Decimal(10),
        allocations: [],
      },
    ]);

    await recordPayment('loan-1', { amount: 110, method: 'CASH' }, actor);

    expect(mocks.tx.loanPayment.create).toHaveBeenCalledOnce();
  });

  it('marks loan PAID and writes LOAN_PAID_OFF log when balance reaches zero', async () => {
    // remainingBalance must equal the principal portion of this payment (100) for isPaidOff to be true
    mocks.prisma.loan.findFirst.mockResolvedValue({
      ...activeLoan,
      remainingBalance: new Decimal(100),
    });

    const installment = {
      id: 'installment-1',
      principal: new Decimal(100),
      interest: new Decimal(10),
      allocations: [],
    };

    // First findMany: unpaid installments for allocation planning
    // Second findMany (inside tx for fully-paid check): same installment with allocations applied
    mocks.tx.loanInstallment.findMany
      .mockResolvedValueOnce([installment])
      .mockResolvedValueOnce([
        {
          ...installment,
          allocations: [
            { principalApplied: new Decimal(100), interestApplied: new Decimal(10) },
          ],
        },
      ]);

    await recordPayment('loan-1', { amount: 110, method: 'CASH' }, actor);

    const loanUpdate = mocks.tx.loan.update.mock.calls[0][0].data;
    expect(loanUpdate.status).toBe('PAID');

    const activityCall = mocks.tx.activityLog.create.mock.calls[0][0].data;
    expect(activityCall.action).toBe('LOAN_PAID_OFF');
  });
});

// ── defaultLoan ───────────────────────────────────────────────────────────────

describe('loans.service defaultLoan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.loan.update.mockResolvedValue({ ...defaultedLoan });
    mocks.tx.loanProvisionEvent.create.mockResolvedValue({});
    mocks.tx.activityLog.create.mockResolvedValue({});
    mocks.prisma.loanInstallment.findFirst.mockResolvedValue(null);
  });

  it('throws LOAN_INVALID_STATE when loan is PENDING', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(baseLoan);
    // SELECT FOR UPDATE returns array of raw rows
    mocks.tx.$queryRaw.mockResolvedValue([baseLoan]);

    await expect(defaultLoan('loan-1', { daysPastDue: 30 }, actor)).rejects.toMatchObject({
      code: 'LOAN_INVALID_STATE',
      status: 409,
    });
  });

  it('creates provision event and audit log for ACTIVE loan', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(activeLoan);
    mocks.tx.$queryRaw.mockResolvedValue([activeLoan]);

    await defaultLoan('loan-1', { daysPastDue: 30, reason: 'Non-payment' }, actor);

    expect(mocks.tx.loan.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'DEFAULTED' }) }),
    );
    expect(mocks.tx.loanProvisionEvent.create).toHaveBeenCalledOnce();
    expect(mocks.tx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'LOAN_DEFAULTED' }) }),
    );
  });

  it('creates provision event for IN_ARREARS loan', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(arrearsLoan);
    mocks.tx.$queryRaw.mockResolvedValue([arrearsLoan]);

    await defaultLoan('loan-1', { daysPastDue: 90 }, actor);

    expect(mocks.tx.loanProvisionEvent.create).toHaveBeenCalledOnce();
  });
});

// ── softDeleteLoan ────────────────────────────────────────────────────────────

describe('loans.service softDeleteLoan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.loan.update.mockResolvedValue({});
    mocks.tx.activityLog.create.mockResolvedValue({});
  });

  it('throws LOAN_INVALID_STATE when loan is ACTIVE', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(activeLoan);

    await expect(softDeleteLoan('loan-1', actor)).rejects.toMatchObject({
      code: 'LOAN_INVALID_STATE',
      status: 409,
    });
  });

  it('throws LOAN_INVALID_STATE when loan is IN_ARREARS', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(arrearsLoan);

    await expect(softDeleteLoan('loan-1', actor)).rejects.toMatchObject({
      code: 'LOAN_INVALID_STATE',
      status: 409,
    });
  });

  it('soft-deletes a CANCELED loan', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(canceledLoan);

    await softDeleteLoan('loan-1', actor);

    expect(mocks.tx.loan.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
    );
    expect(mocks.tx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'LOAN_DELETED' }) }),
    );
  });
});

// ── restoreLoan ───────────────────────────────────────────────────────────────

describe('loans.service restoreLoan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.loan.update.mockResolvedValue({ ...canceledLoan, deletedAt: null });
    mocks.tx.activityLog.create.mockResolvedValue({});
  });

  it('throws NOT_FOUND when no deleted loan exists', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(null);

    await expect(restoreLoan('loan-1', actor)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('clears deletedAt and writes audit log', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue({
      ...canceledLoan,
      deletedAt: new Date('2024-01-01'),
    });

    await restoreLoan('loan-1', actor);

    expect(mocks.tx.loan.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletedAt: null }) }),
    );
    expect(mocks.tx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'LOAN_RESTORED' }) }),
    );
  });
});

// ── markLoanArrears ───────────────────────────────────────────────────────────

describe('loans.service markLoanArrears', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.loan.update.mockResolvedValue(arrearsLoan);
    mocks.tx.activityLog.create.mockResolvedValue({});
  });

  it('throws LOAN_INVALID_STATE when loan is not ACTIVE', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(arrearsLoan);

    await expect(markLoanArrears('loan-1', {}, actor)).rejects.toMatchObject({
      code: 'LOAN_INVALID_STATE',
      status: 409,
    });
  });

  it('transitions ACTIVE loan to IN_ARREARS', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(activeLoan);

    await markLoanArrears('loan-1', { reason: 'Missed 2 payments' }, actor);

    expect(mocks.tx.loan.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'IN_ARREARS' }) }),
    );
    expect(mocks.tx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'LOAN_MARKED_IN_ARREARS' }),
      }),
    );
  });
});

// ── markLoanCurrent ───────────────────────────────────────────────────────────

describe('loans.service markLoanCurrent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.loan.update.mockResolvedValue(activeLoan);
    mocks.tx.activityLog.create.mockResolvedValue({});
  });

  it('throws LOAN_INVALID_STATE when loan is not IN_ARREARS', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(activeLoan);

    await expect(markLoanCurrent('loan-1', {}, actor)).rejects.toMatchObject({
      code: 'LOAN_INVALID_STATE',
      status: 409,
    });
  });

  it('transitions IN_ARREARS loan back to ACTIVE', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(arrearsLoan);

    await markLoanCurrent('loan-1', { reason: 'Arrears cleared' }, actor);

    expect(mocks.tx.loan.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE' }) }),
    );
    expect(mocks.tx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'LOAN_MARKED_CURRENT' }),
      }),
    );
  });
});

// ── writeOffLoan ──────────────────────────────────────────────────────────────

describe('loans.service writeOffLoan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.loan.update.mockResolvedValue({ ...defaultedLoan, status: 'WRITTEN_OFF' });
    mocks.tx.activityLog.create.mockResolvedValue({});
  });

  it('throws LOAN_INVALID_STATE when loan is not DEFAULTED', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(activeLoan);

    await expect(writeOffLoan('loan-1', { reason: 'Uncollectible' }, actor)).rejects.toMatchObject({
      code: 'LOAN_INVALID_STATE',
      status: 409,
    });
  });

  it('transitions DEFAULTED loan to WRITTEN_OFF', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(defaultedLoan);

    await writeOffLoan('loan-1', { reason: 'Borrower absconded' }, actor);

    expect(mocks.tx.loan.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'WRITTEN_OFF' }) }),
    );
    expect(mocks.tx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'LOAN_WRITTEN_OFF' }) }),
    );
  });
});
