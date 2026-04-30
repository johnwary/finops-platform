import { z } from 'zod';

const phoneRegex = /^(\+63|0)?[0-9]{10}$/;

export const createDepositorSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  email: z.email().toLowerCase(),
  phone: z.string().trim().regex(phoneRegex, 'Invalid PH phone number'),
  address: z.string().min(1).max(500).trim(),
  dateOfBirth: z.coerce.date().optional(),
  idType: z.enum(['NATIONAL_ID', 'PASSPORT', 'DRIVER_LICENSE']).optional(),
  idNumber: z.string().min(1).max(100).trim().optional(),
  notes: z.string().max(2000).trim().optional(),
});

export const updateDepositorSchema = createDepositorSchema.partial();

export const listDepositorsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().max(100).trim().optional(),
});

export const depositorParamsSchema = z.object({ id: z.uuid() });

export type CreateDepositorInput = z.infer<typeof createDepositorSchema>;
export type UpdateDepositorInput = z.infer<typeof updateDepositorSchema>;
export type ListDepositorsInput = z.infer<typeof listDepositorsSchema>;
export type DepositorParamsInput = z.infer<typeof depositorParamsSchema>;
