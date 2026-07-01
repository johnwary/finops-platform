import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { getErrorMessage } from '@/lib/format'
import type { CreateDepositorInput } from '../schemas'
import type { Depositor } from '../types'

export function useCreateDepositor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateDepositorInput) =>
      apiFetch<Depositor>('/api/v1/depositors', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      toast.success('Depositor created.')
      queryClient.invalidateQueries({ queryKey: ['depositors'] })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to create depositor.')),
  })
}
