import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { getErrorMessage } from '@/lib/format'
import type { Loan } from '../types'

export function useRestoreLoan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Loan>(`/api/v1/loans/${id}/restore`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Loan restored.')
      queryClient.invalidateQueries({ queryKey: ['loans'] })
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to restore loan.'))
    },
  })
}
