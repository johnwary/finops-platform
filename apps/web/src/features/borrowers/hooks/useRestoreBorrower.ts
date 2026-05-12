import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, apiFetch } from '@/lib/api'
import { getErrorMessage } from '@/lib/format'
import type { Borrower } from '../types'

export function useRestoreBorrower() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Borrower>(`/api/v1/borrowers/${id}/restore`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Borrower restored.')
      queryClient.invalidateQueries({ queryKey: ['borrowers'] })
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'CONFLICT') {
        toast.error('Cannot restore — an active borrower with the same email or ID number already exists.')
        return
      }
      toast.error(getErrorMessage(err, 'Failed to restore borrower.'))
    },
  })
}
