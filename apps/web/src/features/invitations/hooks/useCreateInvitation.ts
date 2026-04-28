import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import type { CreateInvitationInput } from '../schemas'

export function useCreateInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateInvitationInput) =>
      apiFetch('/api/v1/invitations', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      toast.success('Invitation sent.')
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
    },
  })
}
