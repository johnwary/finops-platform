export type Gender = 'MALE' | 'FEMALE'

export type IdType = 'NATIONAL_ID' | 'PASSPORT' | 'DRIVER_LICENSE'

export type IncomeSource = 'EMPLOYMENT' | 'BUSINESS' | 'PENSION' | 'OTHER'

export interface BorrowerListItem {
  id: string
  firstName: string
  middleName: string | null
  lastName: string
  email: string
  phone: string
  address: string
  gender: Gender
  idType: IdType
  idNumber: string
  incomeSource: IncomeSource
  createdAt: string
  _count: { loans: number }
}

export interface Borrower {
  id: string
  firstName: string
  middleName: string | null
  lastName: string
  email: string
  phone: string
  phoneNormalized: string
  address: string
  dateOfBirth: string
  gender: Gender
  idType: IdType
  idNumber: string
  occupation: string | null
  incomeSource: IncomeSource
  monthlyIncome: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface BorrowerLoanSummary {
  id: string
  type: LoanType
  amount: string
  status: LoanStatus
  applicationDate: string
  endDate: string | null
  remainingBalance: string
}

export type LoanType = 'SALARY' | 'BUSINESS' | 'PERSONAL' | 'PURCHASE_ORDER' | 'PENSION' | 'INVESTMENT'
export type LoanStatus = 'PENDING' | 'APPROVED' | 'ACTIVE' | 'PAID' | 'CANCELED' | 'DEFAULTED'

export interface BorrowerDetail extends Borrower {
  loans: BorrowerLoanSummary[]
}

export interface BorrowerActivityItem {
  id: string
  action: string
  category: string
  metadata: Record<string, unknown> | null
  createdAt: string
  userId: string
}
