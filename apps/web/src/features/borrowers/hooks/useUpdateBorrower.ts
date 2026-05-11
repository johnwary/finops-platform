import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { isConflictError, apiFetch } from '@/lib/api'
import { getErrorMessage } from '@/lib/format'
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
      if (isConflictError(err)) return
      toast.error(getErrorMessage(err, 'Failed to update borrower.'))
    },
  })
}
