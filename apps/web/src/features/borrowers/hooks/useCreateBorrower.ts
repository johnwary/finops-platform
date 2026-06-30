import { apiFetch, isConflictError } from '@/lib/api'
import type { CreateBorrowerInput } from '../schemas'
import type { Borrower } from '../types'
import { useBorrowerMutation } from './useBorrowerMutation'

export function useCreateBorrower() {
  return useBorrowerMutation<Borrower, CreateBorrowerInput>({
    mutationFn: (input) =>
      apiFetch<Borrower>('/api/v1/borrowers', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    successMessage: 'Borrower created.',
    errorMessage: 'Failed to create borrower.',
    handleError: isConflictError,
  })
}
