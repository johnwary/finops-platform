import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { getErrorMessage } from '@/lib/format'
import type { CreateLoanInput } from '../schemas'
import type { Loan } from '../types'

export function useCreateLoan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateLoanInput) => {
      const body = {
        ...input,
        interestRate: input.interestRate / 100,
        penaltyRate: input.penaltyRate !== undefined ? input.penaltyRate / 100 : undefined,
      }
      return apiFetch<Loan>('/api/v1/loans', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      toast.success('Loan created.')
      queryClient.invalidateQueries({ queryKey: ['loans'] })
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to create loan.'))
    },
  })
}
