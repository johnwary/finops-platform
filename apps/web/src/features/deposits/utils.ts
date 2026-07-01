export interface DepositKpiInput {
  amount: string
  totalPayoutPaid: string
  principalReturned: string
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
  const principalReturned = parseFloat(d.principalReturned)
  return {
    totalPaidOut: paidOut.toFixed(2),
    principalReturned: principalReturned.toFixed(2),
    returnEarned: (paidOut - principalReturned).toFixed(2),
    principalRemaining: (amount - principalReturned).toFixed(2),
  }
}
