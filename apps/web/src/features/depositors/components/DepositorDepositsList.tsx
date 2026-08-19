import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { depositDetailPath } from '@/lib/app-routes'
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
import { formatPeso } from '@/lib/format'
import { DEPOSIT_STATUS_LABELS, DEPOSIT_TYPE_LABELS } from '../utils'
import type { DepositorDepositSummary, DepositStatus } from '../types'

interface DepositorDepositsListProps {
  deposits: DepositorDepositSummary[]
}

const STATUS_VARIANTS: Record<DepositStatus, 'outline' | 'secondary' | 'default' | 'destructive'> = {
  ACTIVE: 'default',
  WITHDRAWN: 'secondary',
  CLOSED: 'outline',
}

export function DepositorDepositsList({ deposits }: DepositorDepositsListProps) {
  if (!deposits.length) {
    return <p className="text-sm text-muted-foreground">No deposits yet.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Term</TableHead>
          <TableHead>Start</TableHead>
          <TableHead>End</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {deposits.map((deposit) => (
          <TableRow key={deposit.id}>
            <TableCell>{DEPOSIT_TYPE_LABELS[deposit.depositType]}</TableCell>
            <TableCell className="tabular-nums">{formatPeso(deposit.amount)}</TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANTS[deposit.status]}>{DEPOSIT_STATUS_LABELS[deposit.status]}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground tabular-nums">{deposit.termMonths} mo</TableCell>
            <TableCell className="text-muted-foreground">
              {format(new Date(deposit.startDate), 'MMM d, yyyy')}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {deposit.endDate ? format(new Date(deposit.endDate), 'MMM d, yyyy') : '—'}
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" asChild>
                <Link to={depositDetailPath(deposit.id)}>View</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
