import { z } from 'zod'

export const createLoanSchema = z.object({
  borrowerId: z.string().uuid({ message: 'Must be a valid UUID' }),
  type: z.enum(['SALARY', 'BUSINESS', 'PERSONAL', 'PURCHASE_ORDER', 'PENSION', 'INVESTMENT']),
  amount: z.number().positive({ message: 'Amount must be positive' }),
  interestRate: z.number().min(0).max(100, { message: 'Rate must be 0–100' }),
  termMonths: z.number().int().min(1).max(360),
  startDate: z.string().min(1, { message: 'Start date required' }),
  paymentFrequency: z.enum(['MONTHLY', 'BIWEEKLY', 'WEEKLY', 'DAILY']),
  repaymentStructure: z.enum(['AMORTIZING', 'INTEREST_ONLY']),
  loanFee: z.number().min(0).optional(),
  penaltyRate: z.number().min(0).max(100).optional(),
  purpose: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
})

export type CreateLoanInput = z.infer<typeof createLoanSchema>

export const disburseLoanSchema = z.object({
  disbursementMethod: z.enum(['CASH', 'BANK_TRANSFER', 'GCASH', 'CHECK']),
  notes: z.string().max(2000).optional(),
})

export type DisburseLoanInput = z.infer<typeof disburseLoanSchema>

export const cancelLoanSchema = z.object({
  cancellationReason: z.string().trim().min(1, { message: 'Reason required' }).max(500),
})

export type CancelLoanInput = z.infer<typeof cancelLoanSchema>

export function recordPaymentSchema(maxAmount: number) {
  return z.object({
    amount: z
      .number()
      .positive({ message: 'Amount must be positive' })
      .max(maxAmount, { message: `Cannot exceed remaining balance of ₱${maxAmount.toFixed(2)}` }),
    paidAt: z.string().min(1, { message: 'Payment date required' }),
    method: z.enum(['CASH', 'BANK_TRANSFER', 'GCASH', 'CHECK']),
    reference: z.string().max(255).optional(),
    notes: z.string().max(2000).optional(),
  })
}

export type RecordPaymentInput = z.infer<ReturnType<typeof recordPaymentSchema>>
