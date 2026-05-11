import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { getErrorMessage } from '@/lib/format'
import type { CancelLoanInput } from '../schemas'
import type { Loan } from '../types'

export function useCancelLoan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & CancelLoanInput) =>
      apiFetch<Loan>(`/api/v1/loans/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (_, { id }) => {
      toast.success('Loan canceled.')
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['loans', id] })
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to cancel loan.'))
    },
  })
}
