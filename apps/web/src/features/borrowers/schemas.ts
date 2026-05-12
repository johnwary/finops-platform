import { z } from 'zod'

const phoneRegex = /^(\+63|0)?[0-9]{10}$/

function isAtLeast18(value: string) {
  const dateOfBirth = new Date(value)
  const eighteenthBirthday = new Date(dateOfBirth)
  eighteenthBirthday.setFullYear(eighteenthBirthday.getFullYear() + 18)
  return !isNaN(dateOfBirth.getTime()) && eighteenthBirthday <= new Date()
}

export const createBorrowerSchema = z.object({
  firstName: z.string().trim().min(1, { message: 'First name required' }).max(255),
  middleName: z.string().trim().max(255).optional(),
  lastName: z.string().trim().min(1, { message: 'Last name required' }).max(255),
  email: z.string().trim().toLowerCase().email({ message: 'Invalid email' }),
  phone: z.string().trim().regex(phoneRegex, { message: 'Invalid PH phone number' }),
  address: z.string().trim().min(1, { message: 'Address required' }).max(500),
  dateOfBirth: z.string().min(1, { message: 'Date of birth required' }).refine(
    isAtLeast18,
    { message: 'Borrower must be at least 18 years old' },
  ),
  gender: z.enum(['MALE', 'FEMALE']),
  idType: z.enum(['NATIONAL_ID', 'PASSPORT', 'DRIVER_LICENSE']),
  idNumber: z.string().trim().min(1, { message: 'ID number required' }).max(100),
  occupation: z.string().trim().max(255).transform((val) => val === '' ? undefined : val).optional(),
  incomeSource: z.enum(['EMPLOYMENT', 'BUSINESS', 'PENSION', 'OTHER']),
  monthlyIncome: z.number().positive({ message: 'Must be positive' }).optional(),
  emergencyContactName: z.string().trim().max(255).transform((val) => val === '' ? undefined : val).optional(),
  emergencyContactPhone: z
    .string()
    .trim()
    .transform((val) => (val === '' ? undefined : val))
    .pipe(z.string().regex(phoneRegex, { message: 'Invalid PH phone number' }).optional())
    .optional(),
  notes: z.string().trim().max(2000).transform((val) => val === '' ? undefined : val).optional(),
})

export type CreateBorrowerInput = z.infer<typeof createBorrowerSchema>

export const updateBorrowerSchema = createBorrowerSchema.partial()

export type UpdateBorrowerInput = z.infer<typeof updateBorrowerSchema>
