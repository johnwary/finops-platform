import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import type { DisburseLoanInput } from '../schemas'
import type { Loan } from '../types'

export function useDisburseLoan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & DisburseLoanInput) =>
      apiFetch<Loan>(`/api/v1/loans/${id}/disburse`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (_, { id }) => {
      toast.success('Loan disbursed.')
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['loans', id] })
    },
  })
}
