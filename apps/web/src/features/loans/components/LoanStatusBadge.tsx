import { Badge } from '@/components/ui/badge'
import type { LoanStatus } from '../types'

interface LoanStatusBadgeProps {
  status: LoanStatus
}

const STATUS_VARIANTS: Record<LoanStatus, 'outline' | 'secondary' | 'default' | 'destructive'> = {
  PENDING: 'outline',
  APPROVED: 'secondary',
  ACTIVE: 'default',
  PAID: 'default',
  CANCELED: 'outline',
  DEFAULTED: 'destructive',
}

const STATUS_LABELS: Record<LoanStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  ACTIVE: 'Active',
  PAID: 'Paid',
  CANCELED: 'Canceled',
  DEFAULTED: 'Defaulted',
}

export function LoanStatusBadge({ status }: LoanStatusBadgeProps) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
}
