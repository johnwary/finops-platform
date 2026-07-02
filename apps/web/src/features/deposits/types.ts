export type DepositStatus = 'ACTIVE' | 'WITHDRAWN' | 'CLOSED'
export type DepositType = 'SPECIAL' | 'REGULAR'
export type DepositPayoutType = 'MATURITY_ONLY' | 'SEMI_ANNUAL' | 'QUARTERLY' | 'MONTHLY_INTEREST'
export type DepositReturnRatePeriod = 'MONTH' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL'
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'GCASH' | 'CHECK'

export interface DepositDepositorSummary {
  id: string
  name: string
  email: string
  phone?: string
}

export interface DepositPayout {
  id: string
  depositId: string
  amount: string
  principalPortion: string
  returnPortion: string
  paidAt: string
  method: PaymentMethod
  notes: string | null
  reversedAt: string | null
  reversalReason: string | null
  createdAt: string
}

export interface DepositListItem {
  id: string
  depositorId: string
  depositor: DepositDepositorSummary
  amount: string
  expectedReturnRate: string
  expectedReturnRatePeriod: DepositReturnRatePeriod
  termMonths: number
  status: DepositStatus
  depositType: DepositType
  payoutType: DepositPayoutType
  startDate: string
  endDate: string | null
  totalPayoutPaid: string
  principalReturned: string
  createdAt: string
}

export interface Deposit extends DepositListItem {
  hasBeenWithdrawn: boolean
  closedAt: string | null
  withdrawnAt: string | null
  notes: string | null
  reference: string | null
  updatedAt: string
  deletedAt: string | null
}

export interface DepositDetail extends Deposit {
  depositor: DepositDepositorSummary
  payouts: DepositPayout[]
}
