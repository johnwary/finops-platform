import { Link } from 'react-router-dom'
import { depositDetailPath, depositorDetailPath } from '@/lib/app-routes'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TableSkeletonBody } from '@/components/ui/table-skeleton'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatPeso, formatPercent } from '@/lib/format'
import { useDeposits } from '../hooks/useDeposits'
import { DEPOSIT_RETURN_RATE_PERIOD_LABELS } from '../utils'
import type { DepositStatus, DepositType } from '../types'

interface DepositTableProps {
  deposits: ReturnType<typeof useDeposits>
  statusFilter: DepositStatus | undefined
  typeFilter: DepositType | undefined
  onStatusChange: (status: DepositStatus | undefined) => void
  onTypeChange: (type: DepositType | undefined) => void
}

const DEPOSIT_STATUSES: DepositStatus[] = ['ACTIVE', 'WITHDRAWN', 'CLOSED']
const DEPOSIT_TYPES: DepositType[] = ['SPECIAL', 'REGULAR']
const ALL_STATUSES_VALUE = 'ALL_STATUSES'
const ALL_TYPES_VALUE = 'ALL_TYPES'
const TABLE_COL_COUNT = 7

const STATUS_LABELS: Record<DepositStatus, string> = {
  ACTIVE: 'Active',
  WITHDRAWN: 'Withdrawn',
  CLOSED: 'Closed',
}

const TYPE_LABELS: Record<DepositType, string> = {
  SPECIAL: 'Special',
  REGULAR: 'Regular',
}

const STATUS_VARIANTS: Record<DepositStatus, 'outline' | 'secondary' | 'default' | 'destructive'> = {
  ACTIVE: 'default',
  WITHDRAWN: 'outline',
  CLOSED: 'secondary',
}

export function DepositTable({ deposits, statusFilter, typeFilter, onStatusChange, onTypeChange }: DepositTableProps) {
  const isRefetching = deposits.isFetching && !deposits.isPending

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={statusFilter ?? ALL_STATUSES_VALUE}
          onValueChange={(val) => onStatusChange(val === ALL_STATUSES_VALUE ? undefined : val as DepositStatus)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES_VALUE}>All statuses</SelectItem>
            {DEPOSIT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={typeFilter ?? ALL_TYPES_VALUE}
          onValueChange={(val) => onTypeChange(val === ALL_TYPES_VALUE ? undefined : val as DepositType)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TYPES_VALUE}>All types</SelectItem>
            {DEPOSIT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isRefetching && <Spinner className="text-muted-foreground" />}
      </div>

      <DepositTableContent deposits={deposits} />
    </div>
  )
}

function DepositTableContent({ deposits }: { deposits: ReturnType<typeof useDeposits> }) {
  if (deposits.isPending) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Depositor</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead>Term</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Paid Out</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableSkeletonBody columnCount={TABLE_COL_COUNT} />
      </Table>
    )
  }

  if (deposits.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load deposits.</AlertDescription>
      </Alert>
    )
  }

  if (!deposits.data?.data?.length) {
    return <p className="text-sm text-muted-foreground">No deposits found.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Depositor</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Rate</TableHead>
          <TableHead>Term</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Paid Out</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {deposits.data.data.map((d) => (
          <TableRow key={d.id}>
            <TableCell className="font-medium max-w-32 truncate">
              <Link to={depositorDetailPath(d.depositorId)} className="hover:underline">
                {d.depositor.name}
              </Link>
            </TableCell>
            <TableCell className="tabular-nums">{formatPeso(d.amount)}</TableCell>
            <TableCell className="tabular-nums">
              {formatPercent(d.expectedReturnRate)} / {DEPOSIT_RETURN_RATE_PERIOD_LABELS[d.expectedReturnRatePeriod]}
            </TableCell>
            <TableCell>{d.termMonths}mo</TableCell>
            <TableCell>{TYPE_LABELS[d.depositType]}</TableCell>
            <TableCell><Badge variant={STATUS_VARIANTS[d.status]}>{STATUS_LABELS[d.status]}</Badge></TableCell>
            <TableCell className="tabular-nums">{formatPeso(d.totalPayoutPaid)}</TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" asChild>
                <Link to={depositDetailPath(d.id)}>View</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
