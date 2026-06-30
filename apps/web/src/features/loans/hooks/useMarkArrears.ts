import type { ReasonInput } from '../schemas'
import { useLoanAction } from './useLoanAction'

export function useMarkArrears() {
  return useLoanAction<{ id: string } & ReasonInput>({
    action: 'mark-arrears',
    successMessage: 'Loan marked as in arrears.',
    errorMessage: 'Failed to mark loan as in arrears.',
  })
}
