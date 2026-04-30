import { differenceInDays } from 'date-fns';
import { Decimal } from '@prisma/client/runtime/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const DEFAULT_DPD_THRESHOLD = 90;

// BSP-aligned provision buckets — keep in sync with loans.service.ts
const PROVISION_BUCKETS = [
  { maxDpd: 30,       bucket: 1, rate: 0.01 },
  { maxDpd: 90,       bucket: 2, rate: 0.05 },
  { maxDpd: 180,      bucket: 3, rate: 0.25 },
  { maxDpd: 365,      bucket: 4, rate: 0.50 },
  { maxDpd: Infinity, bucket: 5, rate: 1.00 },
] as const;

function resolveProvisionBucket(dpd: number): { bucket: number; rate: number } {
  for (const b of PROVISION_BUCKETS) {
    if (dpd <= b.maxDpd) return { bucket: b.bucket, rate: b.rate };
  }
  return { bucket: 5, rate: 1.0 };
}

export async function runAutoDefaultJob(): Promise<void> {
  const now = new Date();

  // Find ACTIVE loans that have at least one OVERDUE installment
  const candidates = await prisma.loan.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      loanInstallments: { some: { status: 'OVERDUE' } },
    },
    include: {
      loanInstallments: {
        where: { status: 'OVERDUE' },
        orderBy: { dueDate: 'asc' },
        take: 1,
      },
    },
  });

  let defaulted = 0;

  for (const loan of candidates) {
    const earliestOverdue = loan.loanInstallments[0];
    if (!earliestOverdue) continue;

    const dpd = differenceInDays(now, earliestOverdue.dueDate);
    if (dpd < DEFAULT_DPD_THRESHOLD) continue;

    const { bucket, rate } = resolveProvisionBucket(dpd);
    const basisAmount = new Decimal(loan.remainingBalance);
    const provisionAmount = basisAmount.times(rate).toDecimalPlaces(2);

    try {
      await prisma.$transaction(async (tx) => {
        await tx.loan.update({
          where: { id: loan.id },
          data: { status: 'DEFAULTED', defaultedAt: now },
        });

        await tx.loanProvisionEvent.create({
          data: {
            loanId: loan.id,
            type: 'PROVISION',
            bucket,
            daysPastDue: dpd,
            basisAmount,
            provisionRate: new Decimal(rate),
            amount: provisionAmount,
            reason: `Auto-defaulted by system — DPD ${dpd}, bucket ${bucket}`,
          },
        });

        await tx.activityLog.create({
          data: {
            actorType: 'SYSTEM',
            category: 'AUDIT',
            action: 'LOAN_AUTO_DEFAULTED',
            targetId: loan.id,
            metadata: {
              dpd,
              bucket,
              provisionRate: rate,
              provisionAmount,
              remainingBalance: loan.remainingBalance,
            },
          },
        });
      });

      defaulted++;
      logger.info({ loanId: loan.id, dpd, bucket }, 'Loan auto-defaulted');
    } catch (err) {
      logger.error({ err, loanId: loan.id }, 'Auto-default failed for loan');
    }
  }

  logger.info({ checked: candidates.length, defaulted }, 'Auto-default job complete');
}

export function startAutoDefaultScheduler(): void {
  // Run once at startup (catches any missed during downtime), then every 24h
  void runAutoDefaultJob();
  setInterval(() => void runAutoDefaultJob(), 24 * 60 * 60 * 1000);
}
