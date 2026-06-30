import { toast } from 'sonner'
import { ApiError, apiFetch } from '@/lib/api'
import type { Borrower } from '../types'
import { useBorrowerMutation } from './useBorrowerMutation'

export function useRestoreBorrower() {
  return useBorrowerMutation<Borrower, string>({
    mutationFn: (id) =>
      apiFetch<Borrower>(`/api/v1/borrowers/${id}/restore`, { method: 'POST' }),
    successMessage: 'Borrower restored.',
    errorMessage: 'Failed to restore borrower.',
    handleError: (err) => {
      if (!(err instanceof ApiError && err.code === 'CONFLICT')) return false
      toast.error('Cannot restore — an active borrower with the same email or ID number already exists.')
      return true
    },
  })
}
