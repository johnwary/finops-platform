import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { getErrorMessage } from '@/lib/format'
import type { CloseDepositInput } from '../schemas'
import type { Deposit } from '../types'

export function useCloseDeposit(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CloseDepositInput) =>
      apiFetch<Deposit>(`/api/v1/deposits/${id}/close`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      toast.success('Deposit closed.')
      queryClient.invalidateQueries({ queryKey: ['deposits'] })
      queryClient.invalidateQueries({ queryKey: ['deposit', id] })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to close deposit.')),
  })
}
