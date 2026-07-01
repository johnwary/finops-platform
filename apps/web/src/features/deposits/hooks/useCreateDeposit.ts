import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { getErrorMessage } from '@/lib/format'
import type { CreateDepositInput } from '../schemas'
import type { Deposit } from '../types'

// Form takes expectedReturnRate as a percent (6 = 6%); API stores a fraction (0.06).
export function toDepositRequestBody(input: CreateDepositInput) {
  return { ...input, expectedReturnRate: input.expectedReturnRate / 100 }
}

export function useCreateDeposit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateDepositInput) =>
      apiFetch<Deposit>('/api/v1/deposits', { method: 'POST', body: JSON.stringify(toDepositRequestBody(input)) }),
    onSuccess: () => {
      toast.success('Deposit created.')
      queryClient.invalidateQueries({ queryKey: ['deposits'] })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to create deposit.')),
  })
}
