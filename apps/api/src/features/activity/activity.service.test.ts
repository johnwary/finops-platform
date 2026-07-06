import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prisma: {
    activityLog: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../lib/prisma', () => ({ prisma: mocks.prisma }));

import { listActivityLogs } from './activity.service.js';

describe('activity.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.activityLog.findMany.mockResolvedValue([]);
  });

  it('orders logs newest-first and over-fetches by one for the cursor', async () => {
    mocks.prisma.activityLog.findMany.mockResolvedValueOnce([{ id: 'log-1' }, { id: 'log-2' }]);

    const result = await listActivityLogs({ limit: 20 });

    expect(result).toEqual({
      data: [{ id: 'log-1' }, { id: 'log-2' }],
      meta: { nextCursor: null, hasMore: false, limit: 20 },
    });
    expect(mocks.prisma.activityLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 21,
      }),
    );
  });

  it('slices to the limit and returns a nextCursor when more exist', async () => {
    mocks.prisma.activityLog.findMany.mockResolvedValueOnce([
      { id: 'log-1' },
      { id: 'log-2' },
      { id: 'log-3' },
    ]);

    const result = await listActivityLogs({ limit: 2 });

    expect(result.data).toEqual([{ id: 'log-1' }, { id: 'log-2' }]);
    expect(result.meta).toEqual({ nextCursor: 'log-2', hasMore: true, limit: 2 });
  });

  it('passes cursor and skip when a cursor is provided', async () => {
    await listActivityLogs({ cursor: 'log-5', limit: 25 });

    expect(mocks.prisma.activityLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: { id: 'log-5' }, skip: 1 }),
    );
  });

  it('selects only audit-safe fields and joins the actor', async () => {
    await listActivityLogs({ limit: 100 });

    const call = mocks.prisma.activityLog.findMany.mock.calls[0][0];
    expect(call.select).toMatchObject({
      id: true,
      action: true,
      category: true,
      user: { select: { id: true, name: true, email: true } },
    });
  });
});
