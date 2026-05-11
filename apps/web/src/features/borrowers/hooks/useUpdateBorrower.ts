import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, apiFetch } from '@/lib/api'
import type { UpdateBorrowerInput } from '../schemas'
import type { Borrower } from '../types'

interface UpdateBorrowerArgs {
  id: string
  input: UpdateBorrowerInput
}

export function useUpdateBorrower() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: UpdateBorrowerArgs) =>
      apiFetch<Borrower>(`/api/v1/borrowers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, variables) => {
      toast.success('Borrower updated.')
      queryClient.invalidateQueries({ queryKey: ['borrowers'] })
      queryClient.invalidateQueries({ queryKey: ['borrower', variables.id] })
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'CONFLICT') return
      toast.error(err instanceof Error ? err.message : 'Failed to update borrower.')
    },
  })
}
