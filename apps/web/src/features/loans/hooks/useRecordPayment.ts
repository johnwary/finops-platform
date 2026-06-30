import type { RecordPaymentInput } from '../schemas'
import type { LoanPayment } from '../types'
import { useLoanAction } from './useLoanAction'

export function useRecordPayment() {
  return useLoanAction<{ id: string } & RecordPaymentInput, LoanPayment>({
    action: 'payments',
    successMessage: 'Payment recorded.',
    errorMessage: 'Failed to record payment.',
  })
}
