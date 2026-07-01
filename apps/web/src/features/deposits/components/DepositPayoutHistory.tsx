import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatPeso } from '@/lib/format'
import type { DepositPayout } from '../types'
import { PAYMENT_METHOD_LABELS } from '../utils'

interface DepositPayoutHistoryProps {
  payouts: DepositPayout[]
}

export function DepositPayoutHistory({ payouts }: DepositPayoutHistoryProps) {
  if (!payouts.length) {
    return <p className="text-sm text-muted-foreground">No payouts recorded yet.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Paid At</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Principal</TableHead>
          <TableHead>Return</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payouts.map((payout) => (
          <TableRow key={payout.id}>
            <TableCell>{format(new Date(payout.paidAt), 'MMM d, yyyy')}</TableCell>
            <TableCell className="tabular-nums">{formatPeso(payout.amount)}</TableCell>
            <TableCell className="tabular-nums">{formatPeso(payout.principalPortion)}</TableCell>
            <TableCell className="tabular-nums">{formatPeso(payout.returnPortion)}</TableCell>
            <TableCell>{PAYMENT_METHOD_LABELS[payout.method]}</TableCell>
            <TableCell className="text-muted-foreground">{payout.notes ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
