import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { RequireRole } from '@/features/auth/components/RequireRole'
import { formatPeso, formatPercent } from '@/lib/format'
import { CloseForm } from '../components/CloseForm'
import { DepositPayoutHistory } from '../components/DepositPayoutHistory'
import { RecordPayoutForm } from '../components/RecordPayoutForm'
import { WithdrawForm } from '../components/WithdrawForm'
import { useDeposit } from '../hooks/useDeposit'
import type { DepositDetail, DepositStatus } from '../types'
import {
  computeDepositKpis,
  DEPOSIT_PAYOUT_TYPE_LABELS,
  DEPOSIT_RETURN_RATE_PERIOD_LABELS,
  DEPOSIT_TYPE_LABELS,
} from '../utils'

const STATUS_VARIANTS: Record<DepositStatus, 'outline' | 'secondary' | 'default' | 'destructive'> = {
  ACTIVE: 'default',
  WITHDRAWN: 'outline',
  CLOSED: 'secondary',
}

const STATUS_LABELS: Record<DepositStatus, string> = {
  ACTIVE: 'Active',
  WITHDRAWN: 'Withdrawn',
  CLOSED: 'Closed',
}

export function DepositDetailPage() {
  const { id } = useParams<{ id: string }>()
  const deposit = useDeposit(id)
  const [isPayoutOpen, setIsPayoutOpen] = useState(false)
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
  const [isCloseOpen, setIsCloseOpen] = useState(false)

  if (deposit.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (deposit.isError) {
    return (
      <div>
        <Alert variant="destructive">
          <AlertDescription>
            {deposit.error.message ?? 'Failed to load deposit.'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const data = deposit.data
  if (!data) return null

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {DEPOSIT_TYPE_LABELS[data.depositType]} Deposit
          </p>
          <h1 className="text-2xl font-semibold">{formatPeso(data.amount)}</h1>
          <Badge variant={STATUS_VARIANTS[data.status]}>{STATUS_LABELS[data.status]}</Badge>
        </div>

        {data.status === 'ACTIVE' && (
          <RequireRole role={['admin', 'manager']} fallback="hide">
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" onClick={() => setIsPayoutOpen(true)}>Record Payout</Button>
              <Button size="sm" variant="outline" onClick={() => setIsWithdrawOpen(true)}>Withdraw</Button>
              <Button size="sm" variant="outline" onClick={() => setIsCloseOpen(true)}>Close</Button>
            </div>
          </RequireRole>
        )}
      </div>

      {/* KPI row */}
      <DepositKpiRow deposit={data} />

      {/* Details + payout history */}
      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <DepositDetailsCard deposit={data} />

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground pb-1.5 mb-3 border-b">
            Payouts
            {data.payouts.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground font-normal normal-case">
                {data.payouts.length}
              </span>
            )}
          </h2>
          <DepositPayoutHistory payouts={data.payouts} />
        </div>
      </div>

      <Sheet open={isPayoutOpen} onOpenChange={setIsPayoutOpen}>
        <SheetContent className="sm:max-w-lg flex flex-col p-0">
          <SheetHeader className="p-6 pb-0">
            <SheetTitle>Record Payout</SheetTitle>
            <SheetDescription>Record a payout against this deposit.</SheetDescription>
          </SheetHeader>
          <RecordPayoutForm depositId={data.id} onSuccess={() => setIsPayoutOpen(false)} />
        </SheetContent>
      </Sheet>

      <Sheet open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <SheetContent className="flex flex-col p-0">
          <SheetHeader className="p-6 pb-0">
            <SheetTitle>Withdraw Deposit</SheetTitle>
            <SheetDescription>Return principal to the depositor and close this deposit.</SheetDescription>
          </SheetHeader>
          <WithdrawForm depositId={data.id} onSuccess={() => setIsWithdrawOpen(false)} />
        </SheetContent>
      </Sheet>

      <Sheet open={isCloseOpen} onOpenChange={setIsCloseOpen}>
        <SheetContent className="flex flex-col p-0">
          <SheetHeader className="p-6 pb-0">
            <SheetTitle>Close Deposit</SheetTitle>
            <SheetDescription>Close this deposit without a principal payout.</SheetDescription>
          </SheetHeader>
          <CloseForm depositId={data.id} onSuccess={() => setIsCloseOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}

function DepositKpiRow({ deposit }: { deposit: DepositDetail }) {
  const kpis = computeDepositKpis(deposit)

  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-10">
          <KpiStat label="Total Paid Out" value={formatPeso(kpis.totalPaidOut)} isPrimary />
          <div className="flex gap-8 text-sm">
            <KpiStat label="Principal Returned" value={formatPeso(kpis.principalReturned)} />
            <KpiStat label="Return Earned" value={formatPeso(kpis.returnEarned)} />
            <KpiStat label="Principal Remaining" value={formatPeso(kpis.principalRemaining)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function KpiStat({ label, value, isPrimary }: { label: string; value: string; isPrimary?: boolean }) {
  if (isPrimary) {
    return (
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium tabular-nums">{value}</p>
    </div>
  )
}

function DepositDetailsCard({ deposit }: { deposit: DepositDetail }) {
  return (
    <div className="flex flex-col gap-5">
      <DetailsGroup label="Depositor">
        <DetailRow
          label="Name"
          value={
            <Link to={`/dashboard/depositors/${deposit.depositor.id}`} className="hover:underline">
              {deposit.depositor.name}
            </Link>
          }
        />
        <DetailRow label="Email" value={deposit.depositor.email} />
        {deposit.depositor.phone && <DetailRow label="Phone" value={deposit.depositor.phone} />}
      </DetailsGroup>

      <DetailsGroup label="Deposit Terms">
        <DetailRow label="Amount" value={formatPeso(deposit.amount)} />
        <DetailRow
          label="Expected Rate"
          value={`${formatPercent(deposit.expectedReturnRate)} / ${DEPOSIT_RETURN_RATE_PERIOD_LABELS[deposit.expectedReturnRatePeriod]}`}
        />
        <DetailRow label="Term" value={`${deposit.termMonths} months`} />
        <DetailRow label="Type" value={DEPOSIT_TYPE_LABELS[deposit.depositType]} />
        <DetailRow label="Payout Type" value={DEPOSIT_PAYOUT_TYPE_LABELS[deposit.payoutType]} />
      </DetailsGroup>

      <DetailsGroup label="Timeline">
        <DetailRow label="Start Date" value={format(new Date(deposit.startDate), 'MMM d, yyyy')} />
        {deposit.endDate && <DetailRow label="End Date" value={format(new Date(deposit.endDate), 'MMM d, yyyy')} />}
        {deposit.withdrawnAt && <DetailRow label="Withdrawn Date" value={format(new Date(deposit.withdrawnAt), 'MMM d, yyyy')} />}
        {deposit.closedAt && <DetailRow label="Closed Date" value={format(new Date(deposit.closedAt), 'MMM d, yyyy')} />}
        <DetailRow label="Date Created" value={format(new Date(deposit.createdAt), 'MMM d, yyyy')} />
      </DetailsGroup>

      {(deposit.notes || deposit.reference) && (
        <DetailsGroup label="Notes">
          {deposit.reference && <StackedRow label="Reference" value={deposit.reference} />}
          {deposit.notes && <StackedRow label="Notes" value={deposit.notes} />}
        </DetailsGroup>
      )}
    </div>
  )
}

function DetailsGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-foreground pb-1.5 mb-2 border-b">{label}</p>
      <dl className="flex flex-col gap-2 text-sm">{children}</dl>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  )
}

function StackedRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium leading-snug">{value}</dd>
    </div>
  )
}
