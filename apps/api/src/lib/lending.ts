import type { LoanStatus } from '../generated/prisma/client.js';

// Loans still on the books: counted in portfolio, PAR, overdue, and summary reports.
export const OUTSTANDING_LOAN_STATUSES: LoanStatus[] = ['ACTIVE', 'IN_ARREARS', 'DEFAULTED'];

// Loans the auto-default job may act on — collectible, not yet defaulted.
export const AUTO_DEFAULT_STATUSES: LoanStatus[] = ['ACTIVE', 'IN_ARREARS'];

// BSP-aligned provision buckets (rates are regulatory minimums — update when BSP revises)
const PROVISION_BUCKETS = [
  { maxDpd: 30,       bucket: 1, rate: 0.01 }, // Pass
  { maxDpd: 90,       bucket: 2, rate: 0.05 }, // Special Mention
  { maxDpd: 180,      bucket: 3, rate: 0.25 }, // Substandard
  { maxDpd: 365,      bucket: 4, rate: 0.50 }, // Doubtful
  { maxDpd: Infinity, bucket: 5, rate: 1.00 }, // Loss
] as const;

export function resolveProvisionBucket(dpd: number): { bucket: number; rate: number } {
  for (const b of PROVISION_BUCKETS) {
    if (dpd <= b.maxDpd) return { bucket: b.bucket, rate: b.rate };
  }
  return { bucket: 5, rate: 1.0 };
}
