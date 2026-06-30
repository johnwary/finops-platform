import type { WriteOffLoanInput } from '../schemas'
import { useLoanAction } from './useLoanAction'

export function useWriteOffLoan() {
  return useLoanAction<{ id: string } & WriteOffLoanInput>({
    action: 'write-off',
    successMessage: 'Loan written off.',
    errorMessage: 'Failed to write off loan.',
  })
}
