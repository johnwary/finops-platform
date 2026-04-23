import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(1, 'Password is required.'),
})

export const inviteAcceptSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    passwordConfirm: z.string().min(1, 'Confirm your password.'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwords must match.',
    path: ['passwordConfirm'],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type InviteAcceptInput = z.infer<typeof inviteAcceptSchema>
