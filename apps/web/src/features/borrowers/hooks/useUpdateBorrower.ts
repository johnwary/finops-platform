import { apiFetch, isConflictError } from '@/lib/api'
import type { UpdateBorrowerInput } from '../schemas'
import type { Borrower } from '../types'
import { useBorrowerMutation } from './useBorrowerMutation'

interface UpdateBorrowerArgs {
  id: string
  input: UpdateBorrowerInput
}

export function useUpdateBorrower() {
  return useBorrowerMutation<Borrower, UpdateBorrowerArgs>({
    mutationFn: ({ id, input }) =>
      apiFetch<Borrower>(`/api/v1/borrowers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    successMessage: 'Borrower updated.',
    errorMessage: 'Failed to update borrower.',
    borrowerId: (_data, { id }) => id,
    handleError: isConflictError,
  })
}
