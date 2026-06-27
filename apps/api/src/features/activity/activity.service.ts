import { prisma } from '../../lib/prisma.js';
import type { ListActivityLogsInput } from './activity.schema.js';

export function listActivityLogs({ limit }: ListActivityLogsInput) {
  return prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
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
}
