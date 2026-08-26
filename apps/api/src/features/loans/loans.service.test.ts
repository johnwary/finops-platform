import { Decimal } from '@prisma/client/runtime/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const tx = {
    loanInstallment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    loanPayment: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    loanPaymentAllocation: {
      createMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
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
      updateMany: vi.fn(),
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
      loanPaymentAllocation: {
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
  lockLoan,
  markLoanArrears,
  markLoanCurrent,
  recordPayment,
  restoreLoan,
  restructureLoan,
  reversePayment,
  softDeleteLoan,
  unlockLoan,
  writeOffLoan,
} from './loans.service.js';
import { createLoanSchema, recordPaymentSchema, restructureLoanSchema } from './loans.schema.js';

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
    expect(mocks.tx.loan.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ accrualConvention: 'THIRTY_360' }) }),
    );
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
    mocks.tx.$queryRaw.mockResolvedValue([]);

    await expect(approveLoan('loan-1', {}, actor)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('throws LOAN_INVALID_STATE when loan is not PENDING', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([activeLoan]);

    await expect(approveLoan('loan-1', {}, actor)).rejects.toMatchObject({
      code: 'LOAN_INVALID_STATE',
      status: 409,
    });

    expect(mocks.tx.loan.update).not.toHaveBeenCalled();
  });

  it('updates status to APPROVED and writes audit log', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([baseLoan]);

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
    mocks.tx.$queryRaw.mockResolvedValue([approvedLoan]);
    mocks.tx.loan.update.mockResolvedValue({ ...activeLoan });
    mocks.tx.loanInstallment.createMany.mockResolvedValue({ count: 3 });
    mocks.tx.capitalEntry.create.mockResolvedValue({});
    mocks.tx.activityLog.create.mockResolvedValue({});
  });

  it('throws LOAN_INVALID_STATE when loan is not APPROVED', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([activeLoan]);

    await expect(
      disburseLoan('loan-1', { disbursementMethod: 'CASH', collectFee: true }, actor),
    ).rejects.toMatchObject({ code: 'LOAN_INVALID_STATE', status: 409 });

    expect(mocks.tx.loanInstallment.createMany).not.toHaveBeenCalled();
  });

  it('generates correct number of monthly amortizing installments', async () => {
    mocks.prisma.loan.findFirst.mockResolvedValue(approvedLoan);

    await disburseLoan(
      'loan-1',
      { disbursementMethod: 'CASH', disbursedAt: new Date('2024-01-01'), collectFee: true },
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

  it('adjusts final amortizing installment so rounded principal equals loan amount', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([{
      ...approvedLoan,
      interestRate: new Decimal(0),
      termMonths: 3,
    }]);

    await disburseLoan(
      'loan-1',
      { disbursementMethod: 'CASH', disbursedAt: new Date('2024-01-01'), collectFee: true },
      actor,
    );

    const installments = mocks.tx.loanInstallment.createMany.mock.calls[0][0].data;
    const totalPrincipal = installments.reduce(
      (sum: Decimal, i: { principal: Decimal }) => sum.plus(i.principal),
      new Decimal(0),
    );

    expect(totalPrincipal.toFixed(2)).toBe('1000.00');
    expect(installments[2].principal.toFixed(2)).toBe('333.34');
  });

  it('uses 30/360 rates and calendar maturity for new weekly loans', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([{
      ...approvedLoan,
      accrualConvention: 'THIRTY_360',
      paymentFrequency: 'WEEKLY',
      repaymentStructure: 'INTEREST_ONLY',
      termMonths: 12,
      interestRate: new Decimal(0.03),
    }]);

    await disburseLoan(
      'loan-1',
      { disbursementMethod: 'CASH', disbursedAt: new Date('2026-01-01'), collectFee: true },
      actor,
    );

    const installments = mocks.tx.loanInstallment.createMany.mock.calls[0][0].data;
    expect(installments).toHaveLength(53);
    expect(installments[0].interest.toFixed(2)).toBe('7.00');
    expect(installments.at(-1).dueDate).toEqual(new Date('2027-01-01T04:00:00.000Z'));
    expect(installments.at(-1).interest.toFixed(2)).toBe('1.00');
  });

  it('keeps existing loans on the legacy schedule until explicitly migrated', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([{
      ...approvedLoan,
      accrualConvention: null,
      paymentFrequency: 'WEEKLY',
      termMonths: 12,
    }]);

    await disburseLoan(
      'loan-1',
      { disbursementMethod: 'CASH', disbursedAt: new Date('2026-01-01'), collectFee: true },
      actor,
    );

    expect(mocks.tx.loanInstallment.createMany.mock.calls[0][0].data).toHaveLength(48);
  });

  it('never creates a negative final principal installment from cent rounding', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([{
      ...approvedLoan,
      amount: new Decimal(0.02),
      remainingBalance: new Decimal(0.02),
      interestRate: new Decimal(0),
      termMonths: 4,
    }]);

    await disburseLoan(
      'loan-1',
      { disbursementMethod: 'CASH', disbursedAt: new Date('2024-01-01'), collectFee: true },
      actor,
    );

    const installments = mocks.tx.loanInstallment.createMany.mock.calls[0][0].data;
    const totalPrincipal = installments.reduce(
      (sum: Decimal, i: { principal: Decimal }) => sum.plus(i.principal),
      new Decimal(0),
    );

    expect(totalPrincipal.toFixed(2)).toBe('0.02');
    expect(installments.every((i: { principal: Decimal }) => i.principal.greaterThanOrEqualTo(0))).toBe(true);
  });

  it('generates interest-only installments with principal lump at end', async () => {
    const interestOnlyLoan = {
      ...approvedLoan,
      repaymentStructure: 'INTEREST_ONLY',
    };
    mocks.tx.$queryRaw.mockResolvedValue([interestOnlyLoan]);

    await disburseLoan(
      'loan-1',
      { disbursementMethod: 'CASH', disbursedAt: new Date('2024-01-01'), collectFee: true },
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

    await disburseLoan('loan-1', { disbursementMethod: 'GCASH', collectFee: true }, actor);

    expect(mocks.tx.capitalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ flowType: 'OUTFLOW', source: 'LOAN_DISBURSEMENT' }),
      }),
    );
    expect(mocks.tx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'LOAN_DISBURSED' }) }),
    );
  });

  it('sets endDate to the final installment due date', async () => {
    await disburseLoan(
      'loan-1',
      { disbursementMethod: 'CASH', disbursedAt: new Date('2024-01-01'), collectFee: true },
      actor,
    );

    const installments = mocks.tx.loanInstallment.createMany.mock.calls[0][0].data;
    const lastDueDate = installments[installments.length - 1].dueDate;
    expect(mocks.tx.loan.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ endDate: lastDueDate }) }),
    );
  });

  it('records a LOAN_FEE inflow when the loan has a fee and collectFee is true', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([{ ...approvedLoan, loanFee: new Decimal(500) }]);

    await disburseLoan('loan-1', { disbursementMethod: 'CASH', collectFee: true }, actor);

    expect(mocks.tx.capitalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          flowType: 'INFLOW',
          source: 'LOAN_FEE',
          amount: new Decimal(500),
        }),
      }),
    );
  });

  it('skips the fee inflow when collectFee is false', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([{ ...approvedLoan, loanFee: new Decimal(500) }]);

    await disburseLoan('loan-1', { disbursementMethod: 'CASH', collectFee: false }, actor);

    const sources = mocks.tx.capitalEntry.create.mock.calls.map((c) => c[0].data.source);
    expect(sources).toEqual(['LOAN_DISBURSEMENT']);
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
    mocks.tx.$queryRaw.mockResolvedValue([activeLoan]);

    await expect(
      cancelLoan('loan-1', { cancellationReason: 'test' }, actor),
    ).rejects.toMatchObject({ code: 'LOAN_INVALID_STATE', status: 409 });
  });

  it('cancels a PENDING loan', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([baseLoan]);

    const result = await cancelLoan('loan-1', { cancellationReason: 'Duplicate application' }, actor);

    expect(mocks.tx.loan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CANCELED', cancellationReason: 'Duplicate application' }),
      }),
    );
    expect(result).toMatchObject({ status: 'CANCELED' });
  });

  it('cancels an APPROVED loan', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([approvedLoan]);

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
    mocks.tx.$queryRaw.mockResolvedValue([activeLoan]);
    mocks.tx.loanPayment.create.mockImplementation(({ data }) => Promise.resolve({ id: 'payment-1', ...data }));
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
        receiptNumber: expect.stringMatching(/^RCPT-\d{8}-[0-9A-F]{8}$/),
        reference: 'OR-1',
      }),
    });

    const paymentData = mocks.tx.loanPayment.create.mock.calls[0][0].data;
    expect(paymentData.principalPortion.toFixed(2)).toBe('140.00');
    expect(paymentData.interestPortion.toFixed(2)).toBe('40.00');

    const activityData = mocks.tx.activityLog.create.mock.calls[0][0].data;
    expect(activityData.metadata).toMatchObject({
      receiptNumber: paymentData.receiptNumber,
      method: 'CASH',
      reference: 'OR-1',
    });

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
    mocks.tx.$queryRaw.mockResolvedValue([canceledLoan]);

    await expect(
      recordPayment('loan-1', { amount: 100, method: 'CASH' }, actor),
    ).rejects.toMatchObject({ code: 'LOAN_INVALID_STATE', status: 409 });
  });

  it('throws LOAN_LOCKED when loan is locked', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([{ ...activeLoan, locked: true }]);

    await expect(
      recordPayment('loan-1', { amount: 100, method: 'CASH' }, actor),
    ).rejects.toMatchObject({ code: 'LOAN_LOCKED', status: 409 });
  });

  it('throws PAYMENT_BELOW_MINIMUM when payment is less than outstanding interest', async () => {
    mocks.tx.loanInstallment.findFirst.mockResolvedValue({
      id: 'installment-1',
      principal: new Decimal(100),
      interest: new Decimal(50),
      dueDate: new Date(),
      allocations: [],
    });

    await expect(
      recordPayment('loan-1', { amount: 30, method: 'CASH' }, actor),
    ).rejects.toMatchObject({ code: 'PAYMENT_BELOW_MINIMUM', status: 409 });
  });

  it('accepts payment on IN_ARREARS loan', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([arrearsLoan]);
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
    mocks.tx.$queryRaw.mockResolvedValue([{
      ...activeLoan,
      remainingBalance: new Decimal(100),
    }]);

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

describe('recordPaymentSchema money precision', () => {
  it('rejects fractions of a cent', () => {
    expect(recordPaymentSchema.safeParse({ amount: 100.001, method: 'CASH' }).success).toBe(false);
  });
});

describe('loan input precision', () => {
  const createInput = {
    borrowerId: '123e4567-e89b-12d3-a456-426614174000',
    type: 'PERSONAL' as const,
    amount: 1_000,
    interestRate: 0.03,
    termMonths: 12,
    applicationDate: '2026-01-01',
    paymentFrequency: 'MONTHLY',
  };

  it('rejects fractional-cent principal and fees', () => {
    expect(createLoanSchema.safeParse({ ...createInput, amount: 1_000.001 }).success).toBe(false);
    expect(createLoanSchema.safeParse({ ...createInput, loanFee: 1.001 }).success).toBe(false);
  });

  it('rejects rates beyond database precision', () => {
    expect(createLoanSchema.safeParse({ ...createInput, interestRate: 0.01234 }).success).toBe(false);
    expect(createLoanSchema.safeParse({ ...createInput, penaltyRate: 0.01234 }).success).toBe(false);
    expect(restructureLoanSchema.safeParse({ interestRate: 0.01234, reason: 'Rate correction' }).success).toBe(false);
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
    mocks.tx.$queryRaw.mockResolvedValue([activeLoan]);

    await expect(softDeleteLoan('loan-1', actor)).rejects.toMatchObject({
      code: 'LOAN_INVALID_STATE',
      status: 409,
    });
  });

  it('throws LOAN_INVALID_STATE when loan is IN_ARREARS', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([arrearsLoan]);

    await expect(softDeleteLoan('loan-1', actor)).rejects.toMatchObject({
      code: 'LOAN_INVALID_STATE',
      status: 409,
    });
  });

  it('soft-deletes a CANCELED loan', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([canceledLoan]);

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
    mocks.tx.$queryRaw.mockResolvedValue([]);

    await expect(restoreLoan('loan-1', actor)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('clears deletedAt and writes audit log', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([{
      ...canceledLoan,
      deletedAt: new Date('2024-01-01'),
    }]);

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
    mocks.tx.$queryRaw.mockResolvedValue([arrearsLoan]);

    await expect(markLoanArrears('loan-1', {}, actor)).rejects.toMatchObject({
      code: 'LOAN_INVALID_STATE',
      status: 409,
    });
  });

  it('transitions ACTIVE loan to IN_ARREARS', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([activeLoan]);

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
    mocks.tx.$queryRaw.mockResolvedValue([activeLoan]);

    await expect(markLoanCurrent('loan-1', {}, actor)).rejects.toMatchObject({
      code: 'LOAN_INVALID_STATE',
      status: 409,
    });
  });

  it('transitions IN_ARREARS loan back to ACTIVE', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([arrearsLoan]);
    mocks.tx.loanInstallment.findFirst.mockResolvedValue(null);

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

  it('rejects marking current while an installment remains overdue', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([arrearsLoan]);
    mocks.tx.loanInstallment.findFirst.mockResolvedValue({ id: 'installment-1' });

    await expect(markLoanCurrent('loan-1', {}, actor)).rejects.toMatchObject({
      code: 'CONFLICT',
      status: 409,
    });
    expect(mocks.tx.loan.update).not.toHaveBeenCalled();
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
    mocks.tx.$queryRaw.mockResolvedValue([activeLoan]);

    await expect(writeOffLoan('loan-1', { reason: 'Uncollectible' }, actor)).rejects.toMatchObject({
      code: 'LOAN_INVALID_STATE',
      status: 409,
    });
  });

  it('transitions DEFAULTED loan to WRITTEN_OFF', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([defaultedLoan]);

    await writeOffLoan('loan-1', { reason: 'Borrower absconded' }, actor);

    expect(mocks.tx.loan.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'WRITTEN_OFF' }) }),
    );
    expect(mocks.tx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'LOAN_WRITTEN_OFF' }) }),
    );
  });
});

// ── recordPayment — penalty-first allocation ──────────────────────────────────

describe('loans.service recordPayment penalty-first allocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.$queryRaw.mockResolvedValue([{
      ...activeLoan,
      penaltyRate: new Decimal('0.001'), // 0.1% daily
    }]);
    mocks.prisma.loanInstallment.findFirst.mockResolvedValue(null);
    mocks.tx.loanPayment.create.mockImplementation(({ data }) => Promise.resolve({ id: 'payment-1', ...data }));
    mocks.tx.loanInstallment.findFirst.mockResolvedValue(null);
    mocks.tx.loanInstallment.updateMany.mockResolvedValue({ count: 0 });
    mocks.tx.loan.update.mockResolvedValue({});
    mocks.tx.capitalEntry.create.mockResolvedValue({});
    mocks.tx.activityLog.create.mockResolvedValue({});
    mocks.tx.loanPaymentAllocation.createMany.mockResolvedValue({ count: 0 });
  });

  it('applies penalties before interest and principal on overdue installment', async () => {
    // dueDate 2026-01-01, paidAt 2026-01-11 → 10 DPD
    // penalty = ₱100 × 0.001/day × 10 days = ₱1.00
    // payment ₱61 = ₱1 penalty + ₱10 interest + ₱50 principal
    mocks.tx.loanInstallment.findMany.mockResolvedValue([
      {
        id: 'installment-1',
        dueDate: new Date('2026-01-01'),
        principal: new Decimal(100),
        interest: new Decimal(10),
        allocations: [],
      },
    ]);

    await recordPayment('loan-1', { amount: 61, method: 'CASH', paidAt: new Date('2026-01-11') }, actor);

    const allocationRows = mocks.tx.loanPaymentAllocation.createMany.mock.calls[0][0].data;
    expect(allocationRows).toHaveLength(1);
    expect(allocationRows[0].penaltiesApplied.toFixed(2)).toBe('1.00');
    expect(allocationRows[0].interestApplied.toFixed(2)).toBe('10.00');
    expect(allocationRows[0].principalApplied.toFixed(2)).toBe('50.00');

    const paymentData = mocks.tx.loanPayment.create.mock.calls[0][0].data;
    expect(paymentData.penalties.toFixed(2)).toBe('1.00');
    expect(paymentData.interestPortion.toFixed(2)).toBe('10.00');
    expect(paymentData.principalPortion.toFixed(2)).toBe('50.00');
  });
});

// ── reversePayment ────────────────────────────────────────────────────────────

describe('loans.service reversePayment', () => {
  const payment = {
    id: 'pay-2',
    loanId: 'loan-1',
    amount: new Decimal(400),
    principalPortion: new Decimal(350),
    receiptNumber: 'RCPT-1',
    reversedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.$queryRaw.mockResolvedValue([{ ...activeLoan, totalPaid: new Decimal(400), remainingBalance: new Decimal(650) }]);
    mocks.tx.loanPayment.findFirst
      .mockResolvedValueOnce(payment)  // lookup
      .mockResolvedValueOnce(payment); // latest check
    mocks.tx.loanPaymentAllocation.findMany.mockResolvedValue([{ installmentId: 'inst-1' }]);
    mocks.tx.loanPaymentAllocation.deleteMany.mockResolvedValue({ count: 1 });
    mocks.tx.loanInstallment.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.loan.update.mockResolvedValue({});
    mocks.tx.loanPayment.update.mockResolvedValue({ ...payment, reversedAt: new Date() });
    mocks.tx.capitalEntry.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.activityLog.create.mockResolvedValue({});
  });

  it('unwinds totals, marks payment and capital entry reversed, and preserves allocations', async () => {
    await reversePayment('loan-1', 'pay-2', { reason: 'Typo' }, actor);

    expect(mocks.tx.loanPaymentAllocation.deleteMany).not.toHaveBeenCalled();
    expect(mocks.tx.loan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalPaid: new Decimal(0),
          remainingBalance: new Decimal(1000),
        }),
      }),
    );
    expect(mocks.tx.loanPayment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reversalReason: 'Typo', reversedById: 'user-1' }),
      }),
    );
    expect(mocks.tx.capitalEntry.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ source: 'LOAN_PAYMENT', sourceId: 'pay-2' }),
      }),
    );
  });

  it('rejects a payment that is not the most recent', async () => {
    mocks.tx.loanPayment.findFirst
      .mockReset()
      .mockResolvedValueOnce(payment)
      .mockResolvedValueOnce({ ...payment, id: 'pay-3' }); // newer payment exists

    await expect(
      reversePayment('loan-1', 'pay-2', { reason: 'Typo' }, actor),
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });

    expect(mocks.tx.loanPaymentAllocation.deleteMany).not.toHaveBeenCalled();
  });

  it('picks the latest payment by recording order (createdAt), not caller-supplied paidAt', async () => {
    await reversePayment('loan-1', 'pay-2', { reason: 'Typo' }, actor);

    // LIFO must key on createdAt: paidAt is backdatable, so ordering by it can
    // reverse a payment that was not applied last and corrupt allocation.
    expect(mocks.tx.loanPayment.findFirst).toHaveBeenCalledWith({
      where: { loanId: 'loan-1', reversedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('rejects an already-reversed payment', async () => {
    mocks.tx.loanPayment.findFirst
      .mockReset()
      .mockResolvedValueOnce({ ...payment, reversedAt: new Date() });

    await expect(
      reversePayment('loan-1', 'pay-2', { reason: 'Typo' }, actor),
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
  });

  it('rejects a reversal without exactly one capital entry', async () => {
    mocks.tx.capitalEntry.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      reversePayment('loan-1', 'pay-2', { reason: 'Typo' }, actor),
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
  });

  it('reopens a PAID loan when principal balance returns above zero', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([
      { ...baseLoan, status: 'PAID', totalPaid: new Decimal(1000), remainingBalance: new Decimal(0) },
    ]);

    await reversePayment('loan-1', 'pay-2', { reason: 'Typo' }, actor);

    expect(mocks.tx.loan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ACTIVE', paidAt: null }),
      }),
    );
  });
});

// ── lockLoan / unlockLoan ─────────────────────────────────────────────────────

describe('loans.service lockLoan/unlockLoan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.loan.update.mockResolvedValue({});
    mocks.tx.activityLog.create.mockResolvedValue({});
  });

  it('locks an unlocked loan and writes audit log', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([activeLoan]);

    await lockLoan('loan-1', { reason: 'Disputed balance' }, actor);

    expect(mocks.tx.loan.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { locked: true } }),
    );
    expect(mocks.tx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'LOAN_LOCKED' }) }),
    );
  });

  it('rejects locking an already-locked loan', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([{ ...activeLoan, locked: true }]);

    await expect(lockLoan('loan-1', {}, actor)).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('unlocks a locked loan', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([{ ...activeLoan, locked: true }]);

    await unlockLoan('loan-1', {}, actor);

    expect(mocks.tx.loan.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { locked: false } }),
    );
  });

  it('rejects unlocking a loan that is not locked', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([activeLoan]);

    await expect(unlockLoan('loan-1', {}, actor)).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});

// ── restructureLoan ───────────────────────────────────────────────────────────

describe('loans.service restructureLoan', () => {
  const activeDisbursedLoan = {
    ...activeLoan,
    disbursedAt: new Date('2025-01-01'),
    remainingBalance: new Decimal(900),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.$queryRaw.mockResolvedValue([activeDisbursedLoan]);
    mocks.tx.loanPaymentAllocation.findFirst.mockResolvedValue(null);
    mocks.tx.loanInstallment.count.mockResolvedValue(0);
    mocks.tx.loanInstallment.deleteMany.mockResolvedValue({ count: 3 });
    mocks.tx.loanInstallment.createMany.mockResolvedValue({});
    mocks.tx.loan.update.mockResolvedValue({ ...activeDisbursedLoan, termMonths: 6 });
    mocks.tx.activityLog.create.mockResolvedValue({});
  });

  it('throws NOT_FOUND when loan does not exist', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([]);

    await expect(
      restructureLoan('loan-1', { termMonths: 6, reason: 'Hardship' }, actor),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('throws LOAN_INVALID_STATE for PENDING loan', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([baseLoan]);

    await expect(
      restructureLoan('loan-1', { termMonths: 6, reason: 'Hardship' }, actor),
    ).rejects.toMatchObject({ code: 'LOAN_INVALID_STATE', status: 409 });
  });

  it('throws CONFLICT when no terms have changed', async () => {
    // Submit identical values to current loan (baseLoan rate=0.03, term=3, MONTHLY, AMORTIZING)
    await expect(
      restructureLoan('loan-1', {
        interestRate: Number(activeDisbursedLoan.interestRate),
        termMonths: activeDisbursedLoan.termMonths,
        paymentFrequency: activeDisbursedLoan.paymentFrequency,
        repaymentStructure: activeDisbursedLoan.repaymentStructure,
        reason: 'No change',
      }, actor),
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });

    expect(mocks.tx.loanInstallment.deleteMany).not.toHaveBeenCalled();
  });

  it('throws CONFLICT when unpaid installments have allocations (inside tx)', async () => {
    mocks.tx.loanPaymentAllocation.findFirst.mockResolvedValue({ id: 'alloc-1' });

    await expect(
      restructureLoan('loan-1', { termMonths: 6, reason: 'Hardship' }, actor),
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });

    expect(mocks.tx.loanInstallment.deleteMany).not.toHaveBeenCalled();
  });

  it('blocks restructure for reversed-payment allocations to preserve audit history', async () => {
    mocks.tx.loanPaymentAllocation.findFirst.mockResolvedValue({ id: 'alloc-1' });

    await expect(
      restructureLoan('loan-1', { termMonths: 6, reason: 'Hardship' }, actor),
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });

    expect(mocks.tx.loanPaymentAllocation.findFirst).toHaveBeenCalledWith({
      where: {
        installment: { loanId: 'loan-1', status: { not: 'PAID' } },
      },
    });
    expect(mocks.tx.loanInstallment.deleteMany).not.toHaveBeenCalled();
  });

  it('rebuilds installment schedule and writes LOAN_RESTRUCTURED audit log', async () => {
    await restructureLoan('loan-1', { termMonths: 6, reason: 'Hardship' }, actor);

    expect(mocks.tx.loanInstallment.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ loanId: 'loan-1' }) }),
    );
    expect(mocks.tx.loanInstallment.createMany).toHaveBeenCalledOnce();
    expect(mocks.tx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'LOAN_RESTRUCTURED' }) }),
    );
  });

  it('sets endDate to the last rebuilt installment due date, not term from disbursement', async () => {
    await restructureLoan('loan-1', { termMonths: 6, reason: 'Hardship' }, actor);

    const installments = mocks.tx.loanInstallment.createMany.mock.calls[0][0].data;
    const lastDueDate = installments[installments.length - 1].dueDate;
    expect(mocks.tx.loan.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ endDate: lastDueDate }) }),
    );
    // Schedule restarted today — end date must be in the future, not anchored
    // to the original 2025-01-01 disbursement.
    expect(lastDueDate.getTime()).toBeGreaterThan(Date.now());
  });
});
