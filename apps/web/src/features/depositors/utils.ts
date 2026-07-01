import type { DepositStatus, DepositType, IdType } from './types'

export const ID_TYPE_LABELS: Record<IdType, string> = {
  NATIONAL_ID: 'National ID',
  PASSPORT: 'Passport',
  DRIVER_LICENSE: 'Driver License',
}

export const DEPOSIT_STATUS_LABELS: Record<DepositStatus, string> = {
  ACTIVE: 'Active',
  WITHDRAWN: 'Withdrawn',
  CLOSED: 'Closed',
}

export const DEPOSIT_TYPE_LABELS: Record<DepositType, string> = {
  SPECIAL: 'Special',
  REGULAR: 'Regular',
}
