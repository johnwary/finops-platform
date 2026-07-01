import { describe, expect, it } from 'vitest'
import { toDepositRequestBody } from './useCreateDeposit'
import type { CreateDepositInput } from '../schemas'

const base: CreateDepositInput = {
  depositorId: '00000000-0000-0000-0000-000000000000',
  amount: 100000,
  expectedReturnRate: 6,
  expectedReturnRatePeriod: 'MONTH',
  termMonths: 12,
  startDate: '2026-01-01',
  depositType: 'REGULAR',
  payoutType: 'MONTHLY_INTEREST',
}

describe('toDepositRequestBody', () => {
  it('converts expectedReturnRate percent to a fraction', () => {
    expect(toDepositRequestBody(base).expectedReturnRate).toBe(0.06)
  })
})
