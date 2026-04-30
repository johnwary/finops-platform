import { z } from 'zod';

export const createDepositSchema = z.object({
  depositorId: z.uuid(),
  amount: z.coerce.number().positive(),
  expectedReturnRate: z.coerce.number().min(0).max(1), // decimal fraction e.g. 0.06 = 6%
  expectedReturnRatePeriod: z
    .enum(['MONTH', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL'])
    .default('MONTH'),
  termMonths: z.coerce.number().int().min(1).max(360),
  startDate: z.coerce.date(),
  depositType: z.enum(['SPECIAL', 'REGULAR']).default('REGULAR'),
  payoutType: z.enum(['MATURITY_ONLY', 'SEMI_ANNUAL', 'QUARTERLY', 'MONTHLY_INTEREST']),
  reference: z.string().max(255).trim().optional(),
  notes: z.string().max(2000).trim().optional(),
});

export const updateDepositSchema = z.object({
  notes: z.string().max(2000).trim().optional(),
  reference: z.string().max(255).trim().optional(),
});

export const withdrawDepositSchema = z.object({
  notes: z.string().max(2000).trim().optional(),
});

export const closeDepositSchema = z.object({
  notes: z.string().max(2000).trim().optional(),
});

export const recordPayoutSchema = z.object({
  amount: z.coerce.number().positive(),
  principalPortion: z.coerce.number().min(0).default(0),
  returnPortion: z.coerce.number().min(0).default(0),
  paidAt: z.coerce.date().optional(),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'GCASH', 'CHECK']),
  notes: z.string().max(2000).trim().optional(),
});

export const listDepositsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  depositorId: z.uuid().optional(),
  status: z.enum(['ACTIVE', 'WITHDRAWN', 'CLOSED']).optional(),
  depositType: z.enum(['SPECIAL', 'REGULAR']).optional(),
});

export const depositParamsSchema = z.object({ id: z.uuid() });

export type CreateDepositInput = z.infer<typeof createDepositSchema>;
export type UpdateDepositInput = z.infer<typeof updateDepositSchema>;
export type WithdrawDepositInput = z.infer<typeof withdrawDepositSchema>;
export type CloseDepositInput = z.infer<typeof closeDepositSchema>;
export type RecordPayoutInput = z.infer<typeof recordPayoutSchema>;
export type ListDepositsInput = z.infer<typeof listDepositsSchema>;
