import { z } from 'zod';

const phoneRegex = /^(\+63|0)?[0-9]{10}$/;

export const createBorrowerSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  email: z.email().toLowerCase(),
  phone: z.string().trim().regex(phoneRegex, 'Invalid PH phone number'),
  address: z.string().min(1).max(500).trim(),
  dateOfBirth: z.coerce.date(),
  gender: z.enum(['MALE', 'FEMALE']),
  idType: z.enum(['NATIONAL_ID', 'PASSPORT', 'DRIVER_LICENSE']),
  idNumber: z.string().min(1).max(100).trim(),
  occupation: z.string().max(255).trim().optional(),
  incomeSource: z.enum(['EMPLOYMENT', 'BUSINESS', 'PENSION', 'OTHER']),
  monthlyIncome: z.coerce.number().positive().optional(),
  emergencyContactName: z.string().max(255).trim().optional(),
  emergencyContactPhone: z.string().trim().regex(phoneRegex, 'Invalid PH phone number').optional(),
  notes: z.string().max(2000).trim().optional(),
});

export const updateBorrowerSchema = createBorrowerSchema.partial();

export const listBorrowersSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().max(100).trim().optional(),
});

export const borrowerParamsSchema = z.object({
  id: z.uuid(),
});

export type CreateBorrowerInput = z.infer<typeof createBorrowerSchema>;
export type UpdateBorrowerInput = z.infer<typeof updateBorrowerSchema>;
export type ListBorrowersInput = z.infer<typeof listBorrowersSchema>;
export type BorrowerParamsInput = z.infer<typeof borrowerParamsSchema>;
