import type { RestructureLoanInput } from '../schemas'
import { useLoanAction } from './useLoanAction'

export function useRestructureLoan() {
  return useLoanAction<{ id: string } & RestructureLoanInput>({
    action: 'restructure',
    successMessage: 'Loan restructured. New schedule generated.',
    errorMessage: 'Failed to restructure loan.',
    body: (input) => {
      const body: Partial<typeof input> = { ...input }
      delete body.id

      return {
        ...body,
        // API expects decimal fraction; frontend uses percentage.
        interestRate: body.interestRate !== undefined ? body.interestRate / 100 : undefined,
      }
    },
  })
}
