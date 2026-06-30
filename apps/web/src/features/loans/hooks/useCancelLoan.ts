import type { CancelLoanInput } from '../schemas'
import { useLoanAction } from './useLoanAction'

export function useCancelLoan() {
  return useLoanAction<{ id: string } & CancelLoanInput>({
    action: 'cancel',
    successMessage: 'Loan canceled.',
    errorMessage: 'Failed to cancel loan.',
  })
}
