import { describe, expect, it } from 'vitest'
import { createLoanSchema, recordPaymentSchema } from './schemas'

const validLoan = {
  borrowerId: '00000000-0000-0000-0000-000000000000',
  type: 'PERSONAL' as const,
  amount: 10000,
  interestRate: 3,
  termMonths: 12,
  applicationDate: '2026-01-01',
  paymentFrequency: 'MONTHLY' as const,
  repaymentStructure: 'AMORTIZING' as const,
}

describe('createLoanSchema', () => {
  it('accepts a valid loan', () => {
    expect(createLoanSchema.safeParse(validLoan).success).toBe(true)
  })

  it('rejects a non-positive amount', () => {
    expect(createLoanSchema.safeParse({ ...validLoan, amount: 0 }).success).toBe(false)
  })

  it('rejects an interest rate above 100', () => {
    expect(createLoanSchema.safeParse({ ...validLoan, interestRate: 101 }).success).toBe(false)
  })

  it('rejects a non-UUID borrowerId', () => {
    expect(createLoanSchema.safeParse({ ...validLoan, borrowerId: 'nope' }).success).toBe(false)
  })
})

describe('recordPaymentSchema', () => {
  const schema = recordPaymentSchema(500)
  const validPayment = { amount: 100, paidAt: '2026-01-01', method: 'CASH' as const }

  it('accepts a payment within the scheduled total', () => {
    expect(schema.safeParse(validPayment).success).toBe(true)
  })

  it('rejects an amount over the scheduled total', () => {
    expect(schema.safeParse({ ...validPayment, amount: 500.01 }).success).toBe(false)
  })

  it('rejects a zero or negative amount', () => {
    expect(schema.safeParse({ ...validPayment, amount: 0 }).success).toBe(false)
  })
})
