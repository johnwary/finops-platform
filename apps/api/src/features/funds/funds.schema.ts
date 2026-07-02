import { z } from 'zod';

// Sanity ceiling — guard against fat-finger entries, not a policy limit.
const MAX_MONEY = 100_000_000;

export const createFundSchema = z.object({
  amount: z.coerce.number().positive().max(MAX_MONEY),
  dateAdded: z.coerce.date(),
  remarks: z.string().max(2000).trim().optional(),
});

export const withdrawFundSchema = z.object({
  remarks: z.string().max(2000).trim().optional(),
});

export const listFundsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(['ACTIVE', 'WITHDRAWN']).optional(),
});

export const fundParamsSchema = z.object({ id: z.uuid() });

export type CreateFundInput = z.infer<typeof createFundSchema>;
export type WithdrawFundInput = z.infer<typeof withdrawFundSchema>;
export type ListFundsInput = z.infer<typeof listFundsSchema>;
