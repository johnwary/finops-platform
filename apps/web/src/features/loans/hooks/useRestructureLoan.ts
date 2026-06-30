import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { getErrorMessage } from '@/lib/format'
import type { RestructureLoanInput } from '../schemas'
import type { Loan } from '../types'

export function useRestructureLoan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & RestructureLoanInput) =>
      apiFetch<Loan>(`/api/v1/loans/${id}/restructure`, {
        method: 'POST',
        body: JSON.stringify({
          ...body,
          // API expects decimal fraction; frontend uses percentage
          interestRate: body.interestRate !== undefined ? body.interestRate / 100 : undefined,
        }),
      }),
    onSuccess: (_, { id }) => {
      toast.success('Loan restructured. New schedule generated.')
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['loans', id] })
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to restructure loan.'))
    },
  })
}
