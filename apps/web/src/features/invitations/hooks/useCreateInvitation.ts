import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { Role } from '@/lib/auth-client'

interface CreateInvitationInput {
  email: string
  role: Role
}

export function useCreateInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateInvitationInput) =>
      apiFetch('/api/v1/invitations', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
    },
  })
}
