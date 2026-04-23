import { z } from 'zod';

export const roleSchema = z.enum(['admin', 'manager', 'user']);

export const createInvitationSchema = z.object({
  email: z.email().toLowerCase(),
  role: roleSchema.default('user'),
});

export const validateInviteTokenSchema = z.object({
  token: z.uuid(),
});

export const listInvitationsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED']).optional(),
});

export const invitationParamsSchema = z.object({
  id: z.uuid(),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type ValidateInviteTokenInput = z.infer<typeof validateInviteTokenSchema>;
export type ListInvitationsInput = z.infer<typeof listInvitationsSchema>;
export type InvitationParamsInput = z.infer<typeof invitationParamsSchema>;
