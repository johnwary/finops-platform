import { useLoanAction } from './useLoanAction'

export function useDefaultLoan() {
  return useLoanAction<{ id: string }>({
    action: 'default',
    successMessage: 'Loan marked as defaulted.',
    errorMessage: 'Failed to mark loan as defaulted.',
  })
}
