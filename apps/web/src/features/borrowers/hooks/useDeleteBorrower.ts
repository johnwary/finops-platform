import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, apiFetchVoid } from '@/lib/api'

export function useDeleteBorrower() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiFetchVoid(`/api/v1/borrowers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Borrower deleted.')
      queryClient.invalidateQueries({ queryKey: ['borrowers'] })
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'BORROWER_HAS_LOANS') {
        toast.error('Cannot delete a borrower with existing loans.')
        return
      }
      toast.error(err instanceof Error ? err.message : 'Failed to delete borrower.')
    },
  })
}
