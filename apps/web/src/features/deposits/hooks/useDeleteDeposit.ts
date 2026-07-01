import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetchVoid } from '@/lib/api'
import { getErrorMessage } from '@/lib/format'

export function useDeleteDeposit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetchVoid(`/api/v1/deposits/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Deposit deleted.')
      queryClient.invalidateQueries({ queryKey: ['deposits'] })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to delete deposit.')),
  })
}
