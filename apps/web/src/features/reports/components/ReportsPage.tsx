import { useState } from 'react'
import { Download04Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { downloadCsv } from '@/lib/csv'
import { formatPeso } from '@/lib/format'
import { useDashboardSummary, useOverdue, usePortfolioAtRisk } from '@/features/dashboard/hooks/useDashboard'
import type { DashboardSummary, ReportPeriod } from '@/features/dashboard/types'

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
]

const STATUS_ROWS: Array<{
  key: keyof DashboardSummary['loans']['byStatus']
  label: string
  variant: 'outline' | 'secondary' | 'default' | 'destructive'
}> = [
  { key: 'pending', label: 'Pending', variant: 'outline' },
  { key: 'approved', label: 'Approved', variant: 'secondary' },
  { key: 'active', label: 'Active', variant: 'default' },
  { key: 'paid', label: 'Paid', variant: 'default' },
  { key: 'defaulted', label: 'Defaulted', variant: 'destructive' },
  { key: 'canceled', label: 'Canceled', variant: 'outline' },
]

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-PH').format(value)
}

function StatCard({
  label,
  value,
  sub,
  isLoading,
}: {
  label: string
  value: string
  sub?: string
  isLoading: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        {isLoading ? (
          <Skeleton className="h-6 w-32" />
        ) : (
          <CardTitle className="text-xl tabular-nums">{value}</CardTitle>
        )}
        {sub && !isLoading ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
      </CardHeader>
    </Card>
  )
}

export function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>('month')
  const summary = useDashboardSummary(period)
  const overdue = useOverdue()
  const par = usePortfolioAtRisk()

  const isLoading = summary.isPending || overdue.isPending || par.isPending
  const isError = summary.isError || overdue.isError || par.isError
  const overdueBalance = overdue.data?.data.reduce((sum, loan) => sum + Number(loan.remainingBalance), 0) ?? 0

  function handleExportStatus() {
    if (!summary.data) return
    downloadCsv(`portfolio-status-${period}-${new Date().toISOString().slice(0, 10)}.csv`, STATUS_ROWS.map((row) => {
      const stat = summary.data.loans.byStatus[row.key]
      return {
        status: row.label,
        count: stat.count,
        amount: stat.amount,
        remainingBalance: stat.remainingBalance,
        collected: stat.totalPaid,
      }
    }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">Portfolio report</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              size="sm"
              variant={period === p.value ? 'default' : 'ghost'}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {isError ? (
        <Alert variant="destructive">
          <AlertDescription>Failed to load portfolio report.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active portfolio balance"
          value={formatPeso(summary.data?.loans.activePortfolio.totalRemaining ?? 0)}
          sub={`${formatNumber(summary.data?.loans.activePortfolio.count ?? 0)} active loans`}
          isLoading={isLoading}
        />
        <StatCard
          label="Disbursed this period"
          value={formatPeso(summary.data?.loans.periodDisbursements.amount ?? 0)}
          sub={`${formatNumber(summary.data?.loans.periodDisbursements.count ?? 0)} loans`}
          isLoading={isLoading}
        />
        <StatCard
          label="Collections this period"
          value={formatPeso(summary.data?.collections.inPeriod.amount ?? 0)}
          sub={`${formatNumber(summary.data?.collections.inPeriod.count ?? 0)} payments`}
          isLoading={isLoading}
        />
        <StatCard
          label="Portfolio at risk"
          value={`${par.data?.parRatio ?? '0.00'}%`}
          sub={`${formatPeso(par.data?.atRiskBalance ?? 0)} at risk`}
          isLoading={isLoading}
        />
        <StatCard
          label="Overdue balance"
          value={formatPeso(overdueBalance)}
          sub={`${formatNumber(overdue.data?.meta.total ?? 0)} overdue loans`}
          isLoading={isLoading}
        />
        <StatCard
          label="Total collected (active)"
          value={formatPeso(summary.data?.loans.activePortfolio.totalCollected ?? 0)}
          isLoading={isLoading}
        />
        <StatCard
          label="Net capital position"
          value={formatPeso(summary.data?.capital.allTime.netCapital ?? 0)}
          sub={`Period net: ${formatPeso(summary.data?.capital.inPeriod.net ?? 0)}`}
          isLoading={isLoading}
        />
        <StatCard
          label="Active borrowers"
          value={formatNumber(summary.data?.borrowers.total ?? 0)}
          sub={`+${formatNumber(summary.data?.borrowers.newInPeriod ?? 0)} this period`}
          isLoading={isLoading}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardDescription>Loan status breakdown</CardDescription>
            <CardTitle>Portfolio by Status</CardTitle>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleExportStatus} disabled={!summary.data}>
            <HugeiconsIcon icon={Download04Icon} size={16} />
            Export CSV
          </Button>
        </CardHeader>
        <StatusTable summary={summary.data} isLoading={summary.isPending} />
      </Card>
    </div>
  )
}

function StatusTable({ summary, isLoading }: { summary: DashboardSummary | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Count</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Remaining</TableHead>
            <TableHead>Collected</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {STATUS_ROWS.map((row) => (
            <TableRow key={row.key}>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableCell key={i}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          <TableHead>Count</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Remaining</TableHead>
          <TableHead>Collected</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {STATUS_ROWS.map((row) => {
          const stat = summary?.loans.byStatus[row.key]
          return (
            <TableRow key={row.key}>
              <TableCell>
                <Badge variant={row.variant}>{row.label}</Badge>
              </TableCell>
              <TableCell className="tabular-nums">{formatNumber(stat?.count ?? 0)}</TableCell>
              <TableCell className="tabular-nums">{formatPeso(stat?.amount ?? 0)}</TableCell>
              <TableCell className="tabular-nums">{formatPeso(stat?.remainingBalance ?? 0)}</TableCell>
              <TableCell className="tabular-nums">{formatPeso(stat?.totalPaid ?? 0)}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
