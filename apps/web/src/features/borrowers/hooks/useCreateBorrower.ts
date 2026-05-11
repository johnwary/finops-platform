import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { isConflictError, apiFetch } from '@/lib/api'
import { getErrorMessage } from '@/lib/format'
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
      if (isConflictError(err)) return
      toast.error(getErrorMessage(err, 'Failed to create borrower.'))
    },
  })
}
