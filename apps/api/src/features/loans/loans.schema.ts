import { z } from 'zod';

const dateStringSchema = z
  .string()
  .refine((v) => !isNaN(Date.parse(v)), { message: 'Invalid date' })
  .transform((v) => new Date(v))
  .refine((d) => d <= new Date(), { message: 'Date cannot be in the future' });

export const createLoanSchema = z.object({
  borrowerId: z.uuid(),
  type: z.enum(['SALARY', 'BUSINESS', 'PERSONAL', 'PURCHASE_ORDER', 'PENSION', 'INVESTMENT']),
  amount: z.coerce.number().positive(),
  interestRate: z.coerce.number().min(0).max(1), // decimal fraction e.g. 0.03 = 3%
  termMonths: z.coerce.number().int().min(1).max(360),
  applicationDate: dateStringSchema,
  paymentFrequency: z.enum(['MONTHLY', 'BIWEEKLY', 'WEEKLY', 'DAILY']).default('MONTHLY'),
  repaymentStructure: z.enum(['AMORTIZING', 'INTEREST_ONLY']).default('AMORTIZING'),
  loanFee: z.coerce.number().min(0).optional(),
  penaltyRate: z.coerce.number().min(0).max(1).optional(),
  purpose: z.string().max(500).trim().optional(),
  notes: z.string().max(2000).trim().optional(),
});

export const approveLoanSchema = z.object({
  approvedAt: dateStringSchema.optional(),
});

export const disburseLoanSchema = z.object({
  disbursementMethod: z.enum(['CASH', 'BANK_TRANSFER', 'GCASH', 'CHECK']),
  disbursedAt: dateStringSchema.optional(),
  notes: z.string().max(2000).trim().optional(),
});

export const cancelLoanSchema = z.object({
  cancellationReason: z.string().min(1).max(500).trim(),
});

export const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  paidAt: dateStringSchema.optional(),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'GCASH', 'CHECK']),
  reference: z.string().max(255).trim().optional(),
  notes: z.string().max(2000).trim().optional(),
});

export const listLoansSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  borrowerId: z.uuid().optional(),
  status: z
    .enum(['PENDING', 'APPROVED', 'ACTIVE', 'IN_ARREARS', 'PAID', 'CANCELED', 'DEFAULTED', 'WRITTEN_OFF'])
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

export const markArrearsSchema = z.object({
  reason: z.string().max(500).trim().optional(),
});

export const markCurrentSchema = z.object({
  reason: z.string().max(500).trim().optional(),
});

export const writeOffLoanSchema = z.object({
  reason: z.string().min(1).max(500).trim(),
});

export const listLoanActivitySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const restructureLoanSchema = z.object({
  interestRate: z.coerce.number().min(0).max(1).optional(),
  termMonths: z.coerce.number().int().min(1).max(360).optional(),
  paymentFrequency: z.enum(['MONTHLY', 'BIWEEKLY', 'WEEKLY', 'DAILY']).optional(),
  repaymentStructure: z.enum(['AMORTIZING', 'INTEREST_ONLY']).optional(),
  reason: z.string().min(1).max(500).trim(),
}).refine(
  (v) => v.interestRate !== undefined || v.termMonths !== undefined || v.paymentFrequency !== undefined || v.repaymentStructure !== undefined,
  { message: 'At least one term must change.' },
);

export const loanParamsSchema = z.object({ id: z.uuid() });

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type ApproveLoanInput = z.infer<typeof approveLoanSchema>;
export type DisburseLoanInput = z.infer<typeof disburseLoanSchema>;
export type CancelLoanInput = z.infer<typeof cancelLoanSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type DefaultLoanInput = z.infer<typeof defaultLoanSchema>;
export type MarkArrearsInput = z.infer<typeof markArrearsSchema>;
export type MarkCurrentInput = z.infer<typeof markCurrentSchema>;
export type WriteOffLoanInput = z.infer<typeof writeOffLoanSchema>;
export type RestructureLoanInput = z.infer<typeof restructureLoanSchema>;
export type ListLoansInput = z.infer<typeof listLoansSchema>;
export type ListLoanActivityInput = z.infer<typeof listLoanActivitySchema>;
