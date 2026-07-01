import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { getErrorMessage } from '@/lib/format'
import type { UpdateDepositorInput } from '../schemas'
import type { Depositor } from '../types'

export function useUpdateDepositor(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateDepositorInput) =>
      apiFetch<Depositor>(`/api/v1/depositors/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: () => {
      toast.success('Depositor updated.')
      queryClient.invalidateQueries({ queryKey: ['depositors'] })
      queryClient.invalidateQueries({ queryKey: ['depositor', id] })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to update depositor.')),
  })
}
