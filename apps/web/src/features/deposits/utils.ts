import type { DepositPayoutType, DepositReturnRatePeriod, DepositStatus, DepositType, PaymentMethod } from './types'

export const DEPOSIT_TYPE_LABELS: Record<DepositType, string> = {
  SPECIAL: 'Special',
  REGULAR: 'Regular',
}

export const DEPOSIT_PAYOUT_TYPE_LABELS: Record<DepositPayoutType, string> = {
  MATURITY_ONLY: 'Maturity Only',
  SEMI_ANNUAL: 'Semi-Annual',
  QUARTERLY: 'Quarterly',
  MONTHLY_INTEREST: 'Monthly Interest',
}

export const DEPOSIT_RETURN_RATE_PERIOD_LABELS: Record<DepositReturnRatePeriod, string> = {
  MONTH: 'month',
  QUARTERLY: 'quarter',
  SEMI_ANNUAL: 'semi-annual period',
  ANNUAL: 'year',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  GCASH: 'GCash',
  CHECK: 'Check',
}

export interface DepositKpiInput {
  amount: string
  totalPayoutPaid: string
  principalReturned: string
  status: DepositStatus
}

export interface DepositKpis {
  totalPaidOut: string
  principalReturned: string
  returnEarned: string
  principalRemaining: string
}

// Money strings are 2dp decimals from Prisma; parseFloat is safe for display
// arithmetic here (values well under 2^53 cents). Keep 2dp output.
export function computeDepositKpis(d: DepositKpiInput): DepositKpis {
  const amount = parseFloat(d.amount)
  const paidOut = parseFloat(d.totalPayoutPaid)
  // principalReturned column = sum of principal portions of DepositPayout rows only.
  // The terminal principal return on withdraw/close is booked as a CapitalEntry, NOT a
  // payout, so it never lands in totalPayoutPaid or the column.
  const payoutPrincipal = parseFloat(d.principalReturned)
  // Return Earned = interest actually paid out = every payout minus its principal part.
  // Must use payout principal only; folding in the terminal principal makes it negative.
  const returnEarned = paidOut - payoutPrincipal
  // Principal returned to date: for terminated deposits the whole principal is back
  // (terminal CapitalEntry not reflected in the column), so show the full amount.
  const principalReturned = d.status === 'ACTIVE' ? payoutPrincipal : amount
  return {
    totalPaidOut: paidOut.toFixed(2),
    principalReturned: principalReturned.toFixed(2),
    returnEarned: returnEarned.toFixed(2),
    principalRemaining: (amount - principalReturned).toFixed(2),
  }
}
