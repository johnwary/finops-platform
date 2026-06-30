import { z } from 'zod';

export const updateCompanySchema = z.object({
  name: z.string().trim().min(1).max(200),
  address: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(50).optional(),
  email: z.string().trim().email().max(200).optional().or(z.literal('')),
  website: z.string().trim().max(200).optional(),
  taxId: z.string().trim().max(100).optional(),
  logoUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
