import { z } from 'zod'
import { formatPeso } from './utils'

export const createLoanSchema = z.object({
  borrowerId: z.string().uuid({ message: 'Must be a valid UUID' }),
  type: z.enum(['SALARY', 'BUSINESS', 'PERSONAL', 'PURCHASE_ORDER', 'PENSION', 'INVESTMENT']),
  amount: z.number().positive({ message: 'Amount must be positive' }),
  interestRate: z.number().min(0).max(100, { message: 'Rate must be 0–100' }),
  termMonths: z.number().int().min(1).max(360),
  applicationDate: z.string().min(1, { message: 'Application date required' }),
  paymentFrequency: z.enum(['MONTHLY', 'BIWEEKLY', 'WEEKLY', 'DAILY']),
  repaymentStructure: z.enum(['AMORTIZING', 'INTEREST_ONLY']),
  loanFee: z.number().min(0).optional(),
  penaltyRate: z.number().min(0).max(100).optional(),
  purpose: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
})

export type CreateLoanInput = z.infer<typeof createLoanSchema>

export const approveLoanSchema = z.object({
  approvedAt: z
    .string()
    .min(1, { message: 'Approval date required' })
    .refine((val) => new Date(val) <= new Date(), { message: 'Approval date cannot be in the future' }),
})

export type ApproveLoanInput = z.infer<typeof approveLoanSchema>

export const disburseLoanSchema = z.object({
  disbursementMethod: z.enum(['CASH', 'BANK_TRANSFER', 'GCASH', 'CHECK']),
  disbursedAt: z
    .string()
    .min(1, { message: 'Disbursement date required' })
    .refine((val) => new Date(val) <= new Date(), { message: 'Disbursement date cannot be in the future' }),
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
      .preprocess(
        (val) => (typeof val === 'number' && isNaN(val) ? undefined : val),
        z
          .number({ error: 'Please enter a valid amount' })
          .positive({ message: 'Amount must be greater than zero' })
          .max(maxAmount, { message: `Amount cannot exceed the scheduled total of ${formatPeso(maxAmount)}` }),
      ),
    paidAt: z.string().min(1, { message: 'Payment date required' }),
    method: z.enum(['CASH', 'BANK_TRANSFER', 'GCASH', 'CHECK'], { message: 'Payment method required' }),
    reference: z.string().max(255).optional(),
    notes: z.string().max(2000).optional(),
  })
}

export type RecordPaymentInput = z.infer<ReturnType<typeof recordPaymentSchema>>
