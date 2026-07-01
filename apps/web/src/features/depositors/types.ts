export type IdType = 'NATIONAL_ID' | 'PASSPORT' | 'DRIVER_LICENSE'

export type DepositStatus = 'ACTIVE' | 'WITHDRAWN' | 'CLOSED'
export type DepositType = 'SPECIAL' | 'REGULAR'

export interface DepositorListItem {
  id: string
  name: string
  email: string
  phone: string
  createdAt: string
  depositCount: number
}

export interface Depositor {
  id: string
  name: string
  email: string
  phone: string
  phoneNormalized: string
  address: string
  dateOfBirth: string | null
  idType: IdType | null
  idNumber: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface DepositorDepositSummary {
  id: string
  amount: string
  status: DepositStatus
  depositType: DepositType
  startDate: string
  endDate: string | null
  termMonths: number
}

export interface DepositorDetail extends Depositor {
  deposits: DepositorDepositSummary[]
}
