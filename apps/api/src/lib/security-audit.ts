import type { Request } from 'express';
import { logger } from './logger.js';
import { prisma } from './prisma.js';

type SecurityAuditInput = {
  action: string;
  userId?: string | null;
  req?: Request;
  metadata?: Record<string, unknown>;
};

export async function recordSecurityAudit({
  action,
  userId,
  req,
  metadata,
}: SecurityAuditInput) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: userId ?? null,
        category: 'AUDIT',
        action,
        targetId: userId ?? null,
        metadata: {
          method: req?.method,
          path: req?.originalUrl ?? req?.url,
          ip: req?.ip,
          userAgent: req?.get('user-agent') ?? null,
          ...metadata,
        },
      },
    });
  } catch (err) {
    logger.warn({ err, action }, 'Security audit log failed');
  }
}
