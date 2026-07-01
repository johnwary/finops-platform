import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { getErrorMessage } from '@/lib/format'

export function useDeleteDepositor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/depositors/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Depositor deleted.')
      queryClient.invalidateQueries({ queryKey: ['depositors'] })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to delete depositor.')),
  })
}
