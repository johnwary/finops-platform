import type { DisburseLoanInput } from '../schemas'
import { useLoanAction } from './useLoanAction'

export function useDisburseLoan() {
  return useLoanAction<{ id: string } & DisburseLoanInput>({
    action: 'disburse',
    successMessage: 'Loan disbursed.',
    errorMessage: 'Failed to disburse loan.',
  })
}
