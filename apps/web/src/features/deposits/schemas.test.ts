import { describe, expect, it } from 'vitest'
import { createDepositSchema, recordPayoutSchema } from './schemas'

const validDeposit = {
  depositorId: '00000000-0000-0000-0000-000000000000',
  amount: 100000,
  expectedReturnRate: 6,
  expectedReturnRatePeriod: 'MONTH' as const,
  termMonths: 12,
  startDate: '2026-01-01',
  depositType: 'REGULAR' as const,
  payoutType: 'MONTHLY_INTEREST' as const,
}

describe('createDepositSchema', () => {
  it('accepts a valid deposit', () => {
    expect(createDepositSchema.safeParse(validDeposit).success).toBe(true)
  })
  it('rejects a non-positive amount', () => {
    expect(createDepositSchema.safeParse({ ...validDeposit, amount: 0 }).success).toBe(false)
  })
  it('rejects a rate above 100', () => {
    expect(createDepositSchema.safeParse({ ...validDeposit, expectedReturnRate: 101 }).success).toBe(false)
  })
})

describe('recordPayoutSchema', () => {
  const base = { method: 'CASH' as const, paidAt: '2026-02-01' }
  it('accepts when principal + return equals amount', () => {
    expect(recordPayoutSchema.safeParse({ ...base, amount: 1000, principalPortion: 600, returnPortion: 400 }).success).toBe(true)
  })
  it('rejects when the portions do not sum to amount', () => {
    expect(recordPayoutSchema.safeParse({ ...base, amount: 1000, principalPortion: 600, returnPortion: 300 }).success).toBe(false)
  })
})
