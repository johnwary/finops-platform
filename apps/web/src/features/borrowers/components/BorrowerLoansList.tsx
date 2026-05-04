import { format } from 'date-fns'
import { Link } from 'react-router-dom'
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
import type { BorrowerLoanSummary } from '../types'

interface BorrowerLoansListProps {
  loans: BorrowerLoanSummary[]
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
          <TableHead>Start</TableHead>
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
            <TableCell>{LOAN_STATUS_LABELS[loan.status]}</TableCell>
            <TableCell className="text-muted-foreground">
              {format(new Date(loan.startDate), 'MMM d, yyyy')}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {format(new Date(loan.endDate), 'MMM d, yyyy')}
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
