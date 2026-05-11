import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetchVoid } from '@/lib/api'
import { getErrorMessage } from '@/lib/format'

export function useDeleteLoan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetchVoid(`/api/v1/loans/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Loan deleted.')
      queryClient.invalidateQueries({ queryKey: ['loans'] })
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to delete loan.'))
    },
  })
}
