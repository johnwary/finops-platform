import type { Gender, IdType, IncomeSource } from './types'

export type BorrowerNameParts = {
  firstName: string
  middleName?: string | null
  lastName: string
}

export function formatBorrowerName(b: BorrowerNameParts): string {
  const first = b.middleName ? `${b.firstName} ${b.middleName}` : b.firstName
  return `${b.lastName}, ${first}`
}

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
}

export const ID_TYPE_LABELS: Record<IdType, string> = {
  NATIONAL_ID: 'National ID',
  PASSPORT: 'Passport',
  DRIVER_LICENSE: 'Driver License',
}

export const INCOME_SOURCE_LABELS: Record<IncomeSource, string> = {
  EMPLOYMENT: 'Employment',
  BUSINESS: 'Business',
  PENSION: 'Pension',
  OTHER: 'Other',
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('0')) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }
  if (digits.length === 12 && digits.startsWith('63')) {
    return `+63 ${digits.slice(2, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }
  return phone
}

export function maskIdNumber(idNumber: string): string {
  if (idNumber.length <= 4) return idNumber
  return `••••${idNumber.slice(-4)}`
}

export const optionalNumber = {
  setValueAs: (value: string) => (value === '' ? undefined : Number(value)),
}
