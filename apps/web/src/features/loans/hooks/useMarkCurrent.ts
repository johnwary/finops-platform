import type { ReasonInput } from '../schemas'
import { useLoanAction } from './useLoanAction'

export function useMarkCurrent() {
  return useLoanAction<{ id: string } & ReasonInput>({
    action: 'mark-current',
    successMessage: 'Loan marked as current.',
    errorMessage: 'Failed to mark loan as current.',
  })
}
