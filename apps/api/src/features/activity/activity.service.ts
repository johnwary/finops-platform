import { prisma } from '../../lib/prisma.js';
import type { ListActivityLogsInput } from './activity.schema.js';

export async function listActivityLogs({ cursor, limit }: ListActivityLogsInput) {
  const logs = await prisma.activityLog.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    take: limit + 1,
    select: {
      id: true,
      action: true,
      category: true,
      actorType: true,
      targetId: true,
      metadata: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const hasMore = logs.length > limit;
  const data = hasMore ? logs.slice(0, limit) : logs;
  const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;

  return {
    data,
    meta: {
      nextCursor,
      hasMore,
      limit,
    },
  };
}
