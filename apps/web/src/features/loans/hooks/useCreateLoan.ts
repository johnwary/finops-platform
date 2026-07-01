import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { getErrorMessage } from '@/lib/format'
import type { CreateLoanInput } from '../schemas'
import type { Loan } from '../types'

// Form takes rates as percents (3 = 3%); API stores them as fractions (0.03).
export function toLoanRequestBody(input: CreateLoanInput) {
  return {
    ...input,
    interestRate: input.interestRate / 100,
    penaltyRate: input.penaltyRate !== undefined ? input.penaltyRate / 100 : undefined,
  }
}

export function useCreateLoan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateLoanInput) =>
      apiFetch<Loan>('/api/v1/loans', {
        method: 'POST',
        body: JSON.stringify(toLoanRequestBody(input)),
      }),
    onSuccess: () => {
      toast.success('Loan created.')
      queryClient.invalidateQueries({ queryKey: ['loans'] })
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to create loan.'))
    },
  })
}
