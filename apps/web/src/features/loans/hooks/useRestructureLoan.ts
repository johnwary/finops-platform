import type { RestructureLoanInput } from '../schemas'
import { useLoanAction } from './useLoanAction'

export function useRestructureLoan() {
  return useLoanAction<{ id: string } & RestructureLoanInput>({
    action: 'restructure',
    successMessage: 'Loan restructured. New schedule generated.',
    errorMessage: 'Failed to restructure loan.',
    body: ({ id: _id, ...body }) => ({
      ...body,
      // API expects decimal fraction; frontend uses percentage.
      interestRate: body.interestRate !== undefined ? body.interestRate / 100 : undefined,
    }),
  })
}
