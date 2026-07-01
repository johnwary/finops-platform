import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { getErrorMessage } from '@/lib/format'
import type { RecordPayoutInput } from '../schemas'
import type { DepositPayout } from '../types'

export function useRecordPayout(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RecordPayoutInput) =>
      apiFetch<DepositPayout>(`/api/v1/deposits/${id}/payouts`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      toast.success('Payout recorded.')
      queryClient.invalidateQueries({ queryKey: ['deposits'] })
      queryClient.invalidateQueries({ queryKey: ['deposit', id] })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to record payout.')),
  })
}
