import { describe, expect, it } from 'vitest'
import { toLoanRequestBody } from './useCreateLoan'
import type { CreateLoanInput } from '../schemas'

const base: CreateLoanInput = {
  borrowerId: '00000000-0000-0000-0000-000000000000',
  type: 'PERSONAL',
  amount: 10000,
  interestRate: 3,
  termMonths: 12,
  applicationDate: '2026-01-01',
  paymentFrequency: 'MONTHLY',
  repaymentStructure: 'AMORTIZING',
}

describe('toLoanRequestBody percent conversion', () => {
  it('converts interestRate percent to a fraction', () => {
    expect(toLoanRequestBody(base).interestRate).toBe(0.03)
  })

  it('converts penaltyRate percent to a fraction when present', () => {
    expect(toLoanRequestBody({ ...base, penaltyRate: 5 }).penaltyRate).toBe(0.05)
  })

  it('leaves penaltyRate undefined when omitted', () => {
    expect(toLoanRequestBody(base).penaltyRate).toBeUndefined()
  })
})
