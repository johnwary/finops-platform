import { differenceInDays } from 'date-fns';
import { Decimal } from '@prisma/client/runtime/client';
import nodeCron from 'node-cron';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { resolveProvisionBucket } from '../lib/lending';

const DEFAULT_DPD_THRESHOLD = 90;

export async function markPastDueInstallmentsOverdue(now = new Date()): Promise<number> {
  const pastDueInstallments = await prisma.loanInstallment.findMany({
    where: {
      status: 'SCHEDULED',
      dueDate: { lt: now },
      loan: {
        status: 'ACTIVE',
        deletedAt: null,
      },
    },
    select: {
      id: true,
      principal: true,
      interest: true,
      allocations: {
        select: {
          principalApplied: true,
          interestApplied: true,
        },
      },
    },
  });

  const overdueIds = pastDueInstallments
    .filter((installment) => {
      const principalPaid = installment.allocations.reduce(
        (sum, allocation) => sum.plus(allocation.principalApplied),
        new Decimal(0),
      );
      const interestPaid = installment.allocations.reduce(
        (sum, allocation) => sum.plus(allocation.interestApplied),
        new Decimal(0),
      );

      return (
        new Decimal(installment.principal).minus(principalPaid).greaterThan(0) ||
        new Decimal(installment.interest).minus(interestPaid).greaterThan(0)
      );
    })
    .map((installment) => installment.id);

  if (overdueIds.length === 0) return 0;

  const result = await prisma.loanInstallment.updateMany({
    where: { id: { in: overdueIds }, status: 'SCHEDULED' },
    data: { status: 'OVERDUE' },
  });

  logger.info({ overdue: result.count }, 'Past-due installments marked overdue');
  return result.count;
}

export async function runAutoDefaultJob(): Promise<void> {
  const now = new Date();
  const markedOverdue = await markPastDueInstallmentsOverdue(now);

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

  logger.info({ markedOverdue, checked: candidates.length, defaulted }, 'Auto-default job complete');
}

export function startAutoDefaultScheduler(): void {
  // Run once at startup to catch any missed during downtime
  void runAutoDefaultJob();

  // Then daily at midnight Manila time
  nodeCron.schedule('0 0 * * *', () => void runAutoDefaultJob(), {
    timezone: 'Asia/Manila',
    name: 'auto-default-job',
    noOverlap: true,
  });
}
