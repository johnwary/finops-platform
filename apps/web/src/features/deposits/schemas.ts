import { z } from 'zod'

export const createDepositSchema = z.object({
  depositorId: z.string().uuid({ message: 'Select a depositor' }),
  amount: z.number().positive({ message: 'Amount must be positive' }),
  expectedReturnRate: z.number().min(0).max(100, { message: 'Rate must be 0–100' }),
  expectedReturnRatePeriod: z.enum(['MONTH', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL']),
  termMonths: z.number().int().min(1).max(360),
  startDate: z.string().min(1, { message: 'Start date required' }).refine((v) => !isNaN(Date.parse(v)), { message: 'Invalid date' }),
  depositType: z.enum(['SPECIAL', 'REGULAR']),
  payoutType: z.enum(['MATURITY_ONLY', 'SEMI_ANNUAL', 'QUARTERLY', 'MONTHLY_INTEREST']),
  reference: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
})

export type CreateDepositInput = z.infer<typeof createDepositSchema>

export const recordPayoutSchema = z
  .object({
    amount: z.number().positive({ message: 'Amount must be greater than zero' }),
    principalPortion: z.number().min(0).default(0),
    returnPortion: z.number().min(0).default(0),
    paidAt: z.string().min(1, { message: 'Payment date required' }),
    method: z.enum(['CASH', 'BANK_TRANSFER', 'GCASH', 'CHECK'], { message: 'Payment method required' }),
    notes: z.string().max(2000).optional(),
  })
  .refine(
    (d) => Math.round((d.principalPortion + d.returnPortion) * 100) === Math.round(d.amount * 100),
    { message: 'Principal + return must equal the payout amount.', path: ['amount'] },
  )

export type RecordPayoutInput = z.infer<typeof recordPayoutSchema>

export const withdrawDepositSchema = z.object({ notes: z.string().max(2000).optional() })
export type WithdrawDepositInput = z.infer<typeof withdrawDepositSchema>

export const closeDepositSchema = z.object({ notes: z.string().max(2000).optional() })
export type CloseDepositInput = z.infer<typeof closeDepositSchema>
