import { Decimal } from '@prisma/client/runtime/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    deposit: { update: vi.fn() },
    depositPayout: { create: vi.fn() },
    capitalEntry: { create: vi.fn() },
    activityLog: { create: vi.fn() },
  };
  return {
    tx,
    prisma: {
      $transaction: vi.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
    },
  };
});

vi.mock('../../lib/prisma', () => ({ prisma: mocks.prisma }));

import { closeDeposit, recordPayout, withdrawDeposit } from './deposits.service.js';
import { recordPayoutSchema } from './deposits.schema.js';

const actor = { id: 'user-1' };

const activeDeposit = {
  id: 'dep-1',
  depositorId: 'depositor-1',
  status: 'ACTIVE',
  deletedAt: null,
  amount: new Decimal(100_000),
  totalPayoutPaid: new Decimal(0),
  principalReturned: new Decimal(0),
  notes: null,
};

describe('recordPayout locked recheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.depositPayout.create.mockResolvedValue({ id: 'payout-1' });
  });

  it('rejects a payout when the locked deposit is no longer ACTIVE', async () => {
    // Deposit was closed by a concurrent request between scan and transaction.
    mocks.tx.$queryRaw.mockResolvedValue([
      { id: 'dep-1', status: 'CLOSED', deletedAt: null, totalPayoutPaid: new Decimal(0), principalReturned: new Decimal(0) },
    ]);

    await expect(
      recordPayout('dep-1', { amount: 100, principalPortion: 60, returnPortion: 40, method: 'CASH' }, actor),
    ).rejects.toMatchObject({ status: 409 });

    expect(mocks.tx.depositPayout.create).not.toHaveBeenCalled();
  });

  it('accumulates totals from the locked row', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([
      { id: 'dep-1', status: 'ACTIVE', deletedAt: null, amount: new Decimal(100_000), totalPayoutPaid: new Decimal(100), principalReturned: new Decimal(50) },
    ]);

    await recordPayout('dep-1', { amount: 100, principalPortion: 60, returnPortion: 40, method: 'CASH' }, actor);

    expect(mocks.tx.deposit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalPayoutPaid: new Decimal(200),
          principalReturned: new Decimal(110),
        }),
      }),
    );
  });
});

describe('recordPayout principal cap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.depositPayout.create.mockResolvedValue({ id: 'payout-1' });
  });

  it('rejects a payout whose cumulative principal exceeds the deposit amount', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([
      { ...activeDeposit, principalReturned: new Decimal(99_950) },
    ]);

    await expect(
      recordPayout('dep-1', { amount: 100, principalPortion: 100, returnPortion: 0, method: 'CASH' }, actor),
    ).rejects.toMatchObject({ code: 'PAYOUT_EXCEEDS_PRINCIPAL', status: 409 });

    expect(mocks.tx.depositPayout.create).not.toHaveBeenCalled();
  });
});

describe('deposit termination principal outflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.deposit.update.mockResolvedValue({});
  });

  it('close only outflows the principal not yet returned via payouts', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([
      { ...activeDeposit, principalReturned: new Decimal(40_000) },
    ]);

    await closeDeposit('dep-1', {}, actor);

    expect(mocks.tx.capitalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          flowType: 'OUTFLOW',
          source: 'DEPOSIT_WITHDRAWAL',
          amount: new Decimal(60_000),
        }),
      }),
    );
    expect(mocks.tx.deposit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ principalReturned: new Decimal(100_000) }),
      }),
    );
  });

  it('withdraw skips the capital entry when principal was fully returned already', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([
      { ...activeDeposit, principalReturned: new Decimal(100_000) },
    ]);

    await withdrawDeposit('dep-1', {}, actor);

    expect(mocks.tx.capitalEntry.create).not.toHaveBeenCalled();
    expect(mocks.tx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'DEPOSIT_WITHDRAWN' }) }),
    );
  });
});

describe('recordPayoutSchema sum check', () => {
  const base = { method: 'CASH' as const };

  it('accepts when principal + return equals amount', () => {
    expect(recordPayoutSchema.safeParse({ ...base, amount: 100, principalPortion: 60, returnPortion: 40 }).success).toBe(true);
  });

  it('rejects when the portions do not sum to the amount', () => {
    expect(recordPayoutSchema.safeParse({ ...base, amount: 100, principalPortion: 60, returnPortion: 30 }).success).toBe(false);
  });

  it('rejects an amount over the sanity ceiling', () => {
    expect(recordPayoutSchema.safeParse({ ...base, amount: 100_000_001, principalPortion: 100_000_001, returnPortion: 0 }).success).toBe(false);
  });
});
