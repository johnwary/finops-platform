import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { getErrorMessage } from '@/lib/format'
import type { Loan } from '../types'

export function useDefaultLoan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Loan>(`/api/v1/loans/${id}/default`, { method: 'POST', body: '{}' }),
    onSuccess: (_, id) => {
      toast.success('Loan marked as defaulted.')
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['loans', id] })
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to mark loan as defaulted.'))
    },
  })
}
