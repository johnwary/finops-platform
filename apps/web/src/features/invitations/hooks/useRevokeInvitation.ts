import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export function useRevokeInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/invitations/${id}/revoke`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
    },
  })
}
