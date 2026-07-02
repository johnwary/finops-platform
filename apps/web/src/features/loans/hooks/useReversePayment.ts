import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { getErrorMessage } from '@/lib/format'
import type { LoanPayment } from '../types'

export function useReversePayment(loanId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { paymentId: string; reason: string }) =>
      apiFetch<LoanPayment>(`/api/v1/loans/${loanId}/payments/${input.paymentId}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ reason: input.reason }),
      }),
    onSuccess: () => {
      toast.success('Payment reversed.')
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['loans', loanId] })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to reverse payment.')),
  })
}
