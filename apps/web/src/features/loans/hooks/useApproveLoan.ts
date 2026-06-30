import type { ApproveLoanInput } from '../schemas'
import { useLoanAction } from './useLoanAction'

export function useApproveLoan() {
  return useLoanAction<{ id: string } & ApproveLoanInput>({
    action: 'approve',
    successMessage: 'Loan approved.',
    errorMessage: 'Failed to approve loan.',
  })
}
