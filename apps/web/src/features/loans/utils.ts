import type {
  InstallmentStatus,
  LoanStatus,
  LoanType,
  PaymentFrequency,
  PaymentMethod,
  RepaymentStructure,
} from './types'

export function formatPeso(value: string | number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(Number(value))
}

export function formatPercent(raw: string | number): string {
  return (Number(raw) * 100).toFixed(2) + '%'
}

export const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  SALARY: 'Salary',
  BUSINESS: 'Business',
  PERSONAL: 'Personal',
  PURCHASE_ORDER: 'Purchase Order',
  PENSION: 'Pension',
  INVESTMENT: 'Investment',
}

export const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  ACTIVE: 'Active',
  PAID: 'Paid',
  CANCELED: 'Canceled',
  DEFAULTED: 'Defaulted',
}

export const PAYMENT_FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  MONTHLY: 'Monthly',
  BIWEEKLY: 'Bi-weekly',
  WEEKLY: 'Weekly',
  DAILY: 'Daily',
}

export const REPAYMENT_STRUCTURE_LABELS: Record<RepaymentStructure, string> = {
  AMORTIZING: 'Amortizing',
  INTEREST_ONLY: 'Interest Only',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  GCASH: 'GCash',
  CHECK: 'Check',
}

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  SCHEDULED: 'Scheduled',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
}
