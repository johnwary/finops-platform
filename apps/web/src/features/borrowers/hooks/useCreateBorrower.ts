import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, apiFetch } from '@/lib/api'
import type { CreateBorrowerInput } from '../schemas'
import type { Borrower } from '../types'

export function useCreateBorrower() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateBorrowerInput) =>
      apiFetch<Borrower>('/api/v1/borrowers', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      toast.success('Borrower created.')
      queryClient.invalidateQueries({ queryKey: ['borrowers'] })
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'CONFLICT') return
      toast.error(err instanceof Error ? err.message : 'Failed to create borrower.')
    },
  })
}
