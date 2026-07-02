import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { getErrorMessage } from '@/lib/format'
import type { DepositPayout } from '../types'

export function useReversePayout(depositId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { payoutId: string; reason: string }) =>
      apiFetch<DepositPayout>(`/api/v1/deposits/${depositId}/payouts/${input.payoutId}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ reason: input.reason }),
      }),
    onSuccess: () => {
      toast.success('Payout reversed.')
      queryClient.invalidateQueries({ queryKey: ['deposits'] })
      queryClient.invalidateQueries({ queryKey: ['deposit', depositId] })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to reverse payout.')),
  })
}
