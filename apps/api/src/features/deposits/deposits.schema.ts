import { z } from 'zod';

// Sanity ceilings — guard against fat-finger entries, not policy limits.
const MAX_MONEY = 100_000_000;
const moneySchema = z.coerce
  .number()
  .positive()
  .max(MAX_MONEY)
  .refine((amount) => /^\d+(?:\.\d{1,2})?$/.test(String(amount)), {
    message: 'Amount must have at most two decimal places.',
  });

export const createDepositSchema = z.object({
  depositorId: z.uuid(),
  amount: moneySchema,
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

export const recordPayoutSchema = z
  .object({
    amount: moneySchema,
    principalPortion: moneySchema.or(z.literal(0)).default(0),
    returnPortion: moneySchema.or(z.literal(0)).default(0),
    paidAt: z.coerce.date().refine((date) => date <= new Date(), { message: 'Date cannot be in the future' }).optional(),
    method: z.enum(['CASH', 'BANK_TRANSFER', 'GCASH', 'CHECK']),
    notes: z.string().max(2000).trim().optional(),
  })
  .refine(
    // Money is 2dp; compare in whole cents to avoid float drift.
    (d) => Math.round((d.principalPortion + d.returnPortion) * 100) === Math.round(d.amount * 100),
    { message: 'principalPortion + returnPortion must equal amount.', path: ['amount'] },
  );

export const reversePayoutSchema = z.object({
  reason: z.string().min(1).max(500).trim(),
});

export const payoutParamsSchema = z.object({ id: z.uuid(), payoutId: z.uuid() });

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
export type ReversePayoutInput = z.infer<typeof reversePayoutSchema>;
export type ListDepositsInput = z.infer<typeof listDepositsSchema>;
