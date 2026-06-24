export type LoanType =
  | 'SALARY'
  | 'BUSINESS'
  | 'PERSONAL'
  | 'PURCHASE_ORDER'
  | 'PENSION'
  | 'INVESTMENT'

export type LoanStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'ACTIVE'
  | 'PAID'
  | 'CANCELED'
  | 'DEFAULTED'
  | 'IN_ARREARS'
  | 'WRITTEN_OFF'

export type InstallmentStatus = 'SCHEDULED' | 'PAID' | 'OVERDUE'

export type PaymentFrequency = 'MONTHLY' | 'BIWEEKLY' | 'WEEKLY' | 'DAILY'

export type RepaymentStructure = 'AMORTIZING' | 'INTEREST_ONLY'

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'GCASH' | 'CHECK'

export interface LoanBorrowerSummary {
  id: string
  firstName: string
  middleName: string | null
  lastName: string
  email: string
}

export interface LoanBorrower {
  id: string
  firstName: string
  middleName: string | null
  lastName: string
  email: string
  phone: string
}

export interface LoanInstallment {
  id: string
  loanId: string
  sequence: number
  dueDate: string
  principal: string
  interest: string
  status: InstallmentStatus
  allocations?: LoanPaymentAllocation[]
  createdAt: string
  updatedAt: string
}

export interface LoanPaymentAllocation {
  principalApplied: string
  interestApplied: string
  penaltiesApplied: string
}

export interface LoanPayment {
  id: string
  loanId: string
  amount: string
  principalPortion: string
  interestPortion: string
  investmentReturn: string
  insurance: string
  penalties: string
  paidAt: string
  method: PaymentMethod
  reference: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface Loan {
  id: string
  borrowerId: string
  borrower: LoanBorrowerSummary
  type: LoanType
  amount: string
  interestRate: string
  termMonths: number
  status: LoanStatus
  applicationDate: string
  endDate: string | null
  paymentFrequency: PaymentFrequency
  repaymentStructure: RepaymentStructure
  totalPaid: string
  remainingBalance: string
  loanFee: string | null
  penaltyRate: string | null
  purpose: string | null
  notes: string | null
  disbursementMethod: PaymentMethod | null
  cancellationReason: string | null
  approvedAt: string | null
  approvedById: string | null
  disbursedAt: string | null
  disbursedById: string | null
  canceledAt: string | null
  canceledById: string | null
  defaultedAt: string | null
  paidAt: string | null
  locked: boolean
  createdAt: string
  updatedAt: string
}

export interface LoanDetail extends Omit<Loan, 'borrower'> {
  borrower: LoanBorrower
  loanInstallments: LoanInstallment[]
  loanPayments: LoanPayment[]
}
