import { useLoanAction } from './useLoanAction'

export function useLockLoan() {
  return useLoanAction<{ id: string; reason?: string }>({
    action: 'lock',
    successMessage: 'Loan locked. Payments are blocked until unlocked.',
    errorMessage: 'Failed to lock loan.',
  })
}

export function useUnlockLoan() {
  return useLoanAction<{ id: string; reason?: string }>({
    action: 'unlock',
    successMessage: 'Loan unlocked.',
    errorMessage: 'Failed to unlock loan.',
  })
}
