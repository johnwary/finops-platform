import { z } from 'zod';

export const createLoanSchema = z.object({
  borrowerId: z.uuid(),
  type: z.enum(['SALARY', 'BUSINESS', 'PERSONAL', 'PURCHASE_ORDER', 'PENSION', 'INVESTMENT']),
  amount: z.coerce.number().positive(),
  interestRate: z.coerce.number().min(0).max(1), // decimal fraction e.g. 0.03 = 3%
  termMonths: z.coerce.number().int().min(1).max(360),
  applicationDate: z.coerce.date(),
  paymentFrequency: z.enum(['MONTHLY', 'BIWEEKLY', 'WEEKLY', 'DAILY']).default('MONTHLY'),
  repaymentStructure: z.enum(['AMORTIZING', 'INTEREST_ONLY']).default('AMORTIZING'),
  loanFee: z.coerce.number().min(0).optional(),
  penaltyRate: z.coerce.number().min(0).max(1).optional(),
  purpose: z.string().max(500).trim().optional(),
  notes: z.string().max(2000).trim().optional(),
});

export const approveLoanSchema = z.object({});

export const disburseLoanSchema = z.object({
  disbursementMethod: z.enum(['CASH', 'BANK_TRANSFER', 'GCASH', 'CHECK']),
  notes: z.string().max(2000).trim().optional(),
});

export const cancelLoanSchema = z.object({
  cancellationReason: z.string().min(1).max(500).trim(),
});

export const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  paidAt: z.coerce.date().optional(),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'GCASH', 'CHECK']),
  reference: z.string().max(255).trim().optional(),
  notes: z.string().max(2000).trim().optional(),
});

export const listLoansSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  borrowerId: z.uuid().optional(),
  status: z
    .enum(['PENDING', 'APPROVED', 'ACTIVE', 'PAID', 'CANCELED', 'DEFAULTED'])
    .optional(),
  search: z.string().max(100).trim().optional(),
  type: z
    .enum(['SALARY', 'BUSINESS', 'PERSONAL', 'PURCHASE_ORDER', 'PENSION', 'INVESTMENT'])
    .optional(),
});

export const defaultLoanSchema = z.object({
  daysPastDue: z.coerce.number().int().min(1).optional(),
  reason: z.string().max(500).trim().optional(),
});

export const loanParamsSchema = z.object({ id: z.uuid() });

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type DisburseLoanInput = z.infer<typeof disburseLoanSchema>;
export type CancelLoanInput = z.infer<typeof cancelLoanSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type DefaultLoanInput = z.infer<typeof defaultLoanSchema>;
export type ListLoansInput = z.infer<typeof listLoansSchema>;
