import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LOAN_STATUS_LABELS, LOAN_TYPE_LABELS, formatPeso } from '@/features/loans/utils'
import type { BorrowerLoanSummary, LoanStatus } from '../types'

interface BorrowerLoansListProps {
  loans: BorrowerLoanSummary[]
}

const STATUS_VARIANTS: Record<LoanStatus, 'outline' | 'secondary' | 'default' | 'destructive'> = {
  PENDING: 'outline',
  APPROVED: 'secondary',
  ACTIVE: 'default',
  IN_ARREARS: 'secondary',
  PAID: 'default',
  CANCELED: 'outline',
  DEFAULTED: 'destructive',
  WRITTEN_OFF: 'destructive',
}

export function BorrowerLoansList({ loans }: BorrowerLoansListProps) {
  if (!loans.length) {
    return <p className="text-sm text-muted-foreground">No loans on record.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Applied</TableHead>
          <TableHead>End</TableHead>
          <TableHead>Remaining</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {loans.map((loan) => (
          <TableRow key={loan.id}>
            <TableCell>{LOAN_TYPE_LABELS[loan.type]}</TableCell>
            <TableCell className="tabular-nums">{formatPeso(loan.amount)}</TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANTS[loan.status]}>{LOAN_STATUS_LABELS[loan.status]}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {format(new Date(loan.applicationDate), 'MMM d, yyyy')}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {loan.endDate ? format(new Date(loan.endDate), 'MMM d, yyyy') : '—'}
            </TableCell>
            <TableCell className="tabular-nums">{formatPeso(loan.remainingBalance)}</TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/dashboard/loans/${loan.id}`}>View</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
