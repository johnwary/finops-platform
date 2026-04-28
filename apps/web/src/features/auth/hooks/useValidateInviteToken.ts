import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { Role } from '@/lib/auth-client'

export interface ValidatedInvite {
  email: string
  role: Role
  expiresAt: string
}

export function validateInviteToken(token: string) {
  return apiFetch<ValidatedInvite>('/api/v1/invitations/validate', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export function useValidateInviteToken(token: string | null) {
  return useQuery({
    queryKey: ['invite-token', token],
    queryFn: () => validateInviteToken(token!),
    enabled: Boolean(token),
    staleTime: Infinity,
    retry: false,
  })
}
