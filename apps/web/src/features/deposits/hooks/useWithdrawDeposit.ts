import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { getErrorMessage } from '@/lib/format'
import type { WithdrawDepositInput } from '../schemas'
import type { Deposit } from '../types'

export function useWithdrawDeposit(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: WithdrawDepositInput) =>
      apiFetch<Deposit>(`/api/v1/deposits/${id}/withdraw`, { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      toast.success('Deposit withdrawn.')
      queryClient.invalidateQueries({ queryKey: ['deposits'] })
      queryClient.invalidateQueries({ queryKey: ['deposit', id] })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to withdraw deposit.')),
  })
}
