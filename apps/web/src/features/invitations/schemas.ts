import { z } from 'zod'

export const roleEnum = z.enum(['admin', 'manager', 'user'])

export const createInvitationSchema = z.object({
  email: z.email('Invalid email address.').toLowerCase(),
  role: roleEnum,
})

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>
