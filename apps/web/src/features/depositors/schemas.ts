import { z } from 'zod'

const phoneRegex = /^(\+63|0)?[0-9]{10}$/

export const createDepositorSchema = z.object({
  name: z.string().min(1, { message: 'Name required' }).max(255),
  email: z.string().email({ message: 'Invalid email' }),
  phone: z.string().regex(phoneRegex, { message: 'Invalid PH phone number' }),
  address: z.string().min(1, { message: 'Address required' }).max(500),
  dateOfBirth: z.string().optional(),
  idType: z.enum(['NATIONAL_ID', 'PASSPORT', 'DRIVER_LICENSE']).optional(),
  idNumber: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
})

export const updateDepositorSchema = createDepositorSchema.partial()

export type CreateDepositorInput = z.infer<typeof createDepositorSchema>
export type UpdateDepositorInput = z.infer<typeof updateDepositorSchema>
