import { toast } from 'sonner'
import { ApiError, apiFetchVoid } from '@/lib/api'
import { useBorrowerMutation } from './useBorrowerMutation'

export function useDeleteBorrower() {
  return useBorrowerMutation<void, string>({
    mutationFn: (id) => apiFetchVoid(`/api/v1/borrowers/${id}`, { method: 'DELETE' }),
    successMessage: 'Borrower deleted.',
    errorMessage: 'Failed to delete borrower.',
    borrowerId: (_data, id) => id,
    handleError: (err) => {
      if (!(err instanceof ApiError && err.code === 'BORROWER_HAS_LOANS')) return false
      toast.error('Cannot delete a borrower with existing loans.')
      return true
    },
  })
}
