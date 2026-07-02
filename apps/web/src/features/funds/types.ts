export type BusinessFundStatus = 'ACTIVE' | 'WITHDRAWN'

export interface BusinessFund {
  id: string
  dateAdded: string
  amount: string
  remarks: string | null
  status: BusinessFundStatus
  createdAt: string
  updatedAt: string
}
