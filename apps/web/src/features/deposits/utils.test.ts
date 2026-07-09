import { describe, expect, it } from 'vitest'
import { computeDepositKpis } from './utils'

describe('computeDepositKpis', () => {
  it('derives paid out, principal returned, return earned, principal remaining for an active deposit', () => {
    const kpis = computeDepositKpis({
      amount: '100000.00',
      totalPayoutPaid: '30000.00',
      principalReturned: '20000.00',
      status: 'ACTIVE',
    })
    expect(kpis.totalPaidOut).toBe('30000.00')
    expect(kpis.principalReturned).toBe('20000.00')
    expect(kpis.returnEarned).toBe('10000.00')       // paidOut - principalReturned
    expect(kpis.principalRemaining).toBe('80000.00') // amount - principalReturned
  })

  it('treats a withdrawn deposit as fully returned regardless of the payout-only principalReturned', () => {
    const kpis = computeDepositKpis({
      amount: '100000.00',
      totalPayoutPaid: '0.00',
      principalReturned: '0.00',
      status: 'WITHDRAWN',
    })
    expect(kpis.principalReturned).toBe('100000.00')
    expect(kpis.principalRemaining).toBe('0.00')
    // Return Earned must not fold in the terminal principal (a CapitalEntry, not a
    // payout). No interest paid out here → 0, never a negative principal figure.
    expect(kpis.returnEarned).toBe('0.00')
  })

  it('return earned counts only payout interest for a withdrawn deposit, not the terminal principal', () => {
    const kpis = computeDepositKpis({
      amount: '100000.00',
      totalPayoutPaid: '15000.00',   // 5000 interest payouts + 10000 principal payout
      principalReturned: '10000.00', // payout principal portion only
      status: 'WITHDRAWN',
    })
    expect(kpis.returnEarned).toBe('5000.00')        // paidOut - payout principal
    expect(kpis.principalReturned).toBe('100000.00') // terminated → full principal back
    expect(kpis.principalRemaining).toBe('0.00')
  })
})
