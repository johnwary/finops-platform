import { Decimal } from '@prisma/client/runtime/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    businessFund: { create: vi.fn(), update: vi.fn() },
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

import { createFund, withdrawFund } from './funds.service.js';
import { createFundSchema } from './funds.schema.js';

const actor = { id: 'user-1' };

describe('funds.service createFund', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.businessFund.create.mockResolvedValue({
      id: 'fund-1',
      amount: new Decimal(50_000),
      dateAdded: new Date('2026-01-01'),
    });
  });

  it('creates the fund with a BUSINESS_CAPITAL inflow and audit log', async () => {
    await createFund({ amount: 50_000, dateAdded: new Date('2026-01-01') }, actor);

    expect(mocks.tx.capitalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          flowType: 'INFLOW',
          source: 'BUSINESS_CAPITAL',
          amount: new Decimal(50_000),
        }),
      }),
    );
    expect(mocks.tx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'FUND_ADDED' }) }),
    );
  });
});

describe('createFundSchema', () => {
  it('rejects fractions of a cent', () => {
    expect(createFundSchema.safeParse({ amount: 100.001, dateAdded: new Date() }).success).toBe(false);
  });
});

describe('funds.service withdrawFund', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.businessFund.update.mockResolvedValue({});
  });

  it('marks the fund withdrawn and writes a BUSINESS_CAPITAL outflow', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([
      { id: 'fund-1', status: 'ACTIVE', amount: new Decimal(50_000), remarks: null },
    ]);

    await withdrawFund('fund-1', {}, actor);

    expect(mocks.tx.businessFund.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'WITHDRAWN' }) }),
    );
    expect(mocks.tx.capitalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          flowType: 'OUTFLOW',
          source: 'BUSINESS_CAPITAL',
          amount: new Decimal(50_000),
        }),
      }),
    );
  });

  it('rejects withdrawing an already-withdrawn fund', async () => {
    mocks.tx.$queryRaw.mockResolvedValue([
      { id: 'fund-1', status: 'WITHDRAWN', amount: new Decimal(50_000) },
    ]);

    await expect(withdrawFund('fund-1', {}, actor)).rejects.toMatchObject({
      code: 'FUND_INVALID_STATE',
      status: 409,
    });
  });
});
