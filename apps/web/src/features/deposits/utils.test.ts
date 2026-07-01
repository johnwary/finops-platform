import { describe, expect, it } from 'vitest'
import { computeDepositKpis } from './utils'

describe('computeDepositKpis', () => {
  it('derives paid out, principal returned, return earned, principal remaining', () => {
    const kpis = computeDepositKpis({
      amount: '100000.00',
      totalPayoutPaid: '30000.00',
      principalReturned: '20000.00',
    })
    expect(kpis.totalPaidOut).toBe('30000.00')
    expect(kpis.principalReturned).toBe('20000.00')
    expect(kpis.returnEarned).toBe('10000.00')       // paidOut - principalReturned
    expect(kpis.principalRemaining).toBe('80000.00') // amount - principalReturned
  })
})
