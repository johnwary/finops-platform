import { useState } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPeso } from '@/lib/format'
import { useDashboardSummary, useOverdue, usePortfolioAtRisk } from '../hooks/useDashboard'
import type { ReportPeriod } from '../types'

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
]

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-PH').format(value)
}

interface StatCardProps {
  label: string
  value: string
  sub?: string
  isLoading: boolean
}

function StatCard({ label, value, sub, isLoading }: StatCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        {isLoading ? (
          <Skeleton className="h-6 w-32 mt-1" />
        ) : (
          <CardTitle className="text-xl font-semibold tabular-nums">{value}</CardTitle>
        )}
        {sub && !isLoading && (
          <p className="text-xs text-muted-foreground">{sub}</p>
        )}
      </CardHeader>
    </Card>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {title}
    </h2>
  )
}

export function DashboardPage() {
  const [period, setPeriod] = useState<ReportPeriod>('month')

  const { data: summary, isLoading: summaryLoading } = useDashboardSummary(period)
  const { data: overdueData, isLoading: overdueLoading } = useOverdue()
  const { data: par, isLoading: parLoading } = usePortfolioAtRisk()

  const parNum = Number(par?.parRatio ?? 0)
  const parVariant: 'destructive' | 'secondary' | 'default' =
    parNum >= 10 ? 'destructive' : parNum >= 5 ? 'secondary' : 'default'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Portfolio health snapshot</p>
      </div>

      {/* Period selector */}
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

      {/* Loan portfolio */}
      <div className="flex flex-col gap-3">
        <SectionHeader title="Loan Portfolio" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Active loan book"
            value={formatPeso(summary?.loans.activePortfolio.totalRemaining ?? 0)}
            sub={`${formatNumber(summary?.loans.activePortfolio.count ?? 0)} active loans`}
            isLoading={summaryLoading}
          />
          <StatCard
            label="Disbursed this period"
            value={formatPeso(summary?.loans.periodDisbursements.amount ?? 0)}
            sub={`${formatNumber(summary?.loans.periodDisbursements.count ?? 0)} loans`}
            isLoading={summaryLoading}
          />
          <StatCard
            label="Collections this period"
            value={formatPeso(summary?.collections.inPeriod.amount ?? 0)}
            sub={`${formatNumber(summary?.collections.inPeriod.count ?? 0)} payments`}
            isLoading={summaryLoading}
          />
          <StatCard
            label="Total collected (active)"
            value={formatPeso(summary?.loans.activePortfolio.totalCollected ?? 0)}
            isLoading={summaryLoading}
          />
        </div>
      </div>

      {/* Loan status breakdown */}
      <div className="flex flex-col gap-3">
        <SectionHeader title="Loans by Status" />
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(
            [
              ['Pending',   summary?.loans.byStatus.pending,   'outline'],
              ['Approved',  summary?.loans.byStatus.approved,  'secondary'],
              ['Active',    summary?.loans.byStatus.active,    'default'],
              ['Paid',      summary?.loans.byStatus.paid,      'default'],
              ['Defaulted', summary?.loans.byStatus.defaulted, 'destructive'],
              ['Canceled',  summary?.loans.byStatus.canceled,  'outline'],
            ] as const
          ).map(([label, stat, variant]) => (
            <Card key={label}>
              <CardHeader>
                <CardDescription>{label}</CardDescription>
                {summaryLoading ? (
                  <Skeleton className="h-5 w-12 mt-1" />
                ) : (
                  <>
                    <CardTitle className="text-lg tabular-nums">
                      {formatNumber(stat?.count ?? 0)}
                    </CardTitle>
                    <Badge variant={variant} className="w-fit">
                      {formatPeso(stat?.amount ?? 0)}
                    </Badge>
                  </>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Borrowers + capital */}
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Active borrowers"
          value={formatNumber(summary?.borrowers.total ?? 0)}
          sub={`+${formatNumber(summary?.borrowers.newInPeriod ?? 0)} this period`}
          isLoading={summaryLoading}
        />
        <StatCard
          label="Net capital position"
          value={formatPeso(summary?.capital.allTime.netCapital ?? 0)}
          sub={`Period net: ${formatPeso(summary?.capital.inPeriod.net ?? 0)}`}
          isLoading={summaryLoading}
        />
      </div>

      {/* PAR + Overdue side by side */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Portfolio at risk */}
        <Card>
          <CardHeader>
            <CardDescription>Portfolio at Risk (PAR)</CardDescription>
            <div className="flex items-baseline gap-2 mt-1">
              {parLoading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <>
                  <span className="text-2xl font-semibold tabular-nums">
                    {par?.parRatio ?? '0.00'}%
                  </span>
                  <Badge variant={parVariant}>
                    {parNum >= 10 ? 'High risk' : parNum >= 5 ? 'Watch' : 'Healthy'}
                  </Badge>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {parLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Total portfolio</p>
                  <p className="font-medium tabular-nums">{formatPeso(par?.totalPortfolioBalance ?? 0)}</p>
                  <p className="text-muted-foreground mt-0.5">{formatNumber(par?.totalPortfolioCount ?? 0)} loans</p>
                </div>
                <div>
                  <p className="text-muted-foreground">At risk balance</p>
                  <p className="font-medium tabular-nums text-destructive">{formatPeso(par?.atRiskBalance ?? 0)}</p>
                  <p className="text-muted-foreground mt-0.5">{formatNumber(par?.atRiskCount ?? 0)} loans</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue loans */}
        <Card>
          <CardHeader>
            <CardDescription>Overdue Loans</CardDescription>
            {overdueLoading ? (
              <Skeleton className="h-5 w-16 mt-1" />
            ) : (
              <CardTitle className="text-xl tabular-nums">
                {formatNumber(overdueData?.meta.total ?? 0)}
              </CardTitle>
            )}
          </CardHeader>
          <CardContent>
            {overdueLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !overdueData?.data.length ? (
              <p className="text-xs text-muted-foreground">No overdue loans.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {overdueData.data.slice(0, 5).map((item) => (
                  <div key={item.loanId} className="flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{item.borrower.name}</p>
                      <p className="text-muted-foreground">
                        {item.earliestOverdueDueDate
                          ? format(new Date(item.earliestOverdueDueDate), 'MMM d, yyyy')
                          : '—'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-medium tabular-nums">{formatPeso(item.remainingBalance)}</p>
                      <Badge
                        variant={item.daysPastDue >= 90 ? 'destructive' : item.daysPastDue >= 30 ? 'secondary' : 'outline'}
                      >
                        {item.daysPastDue}d DPD
                      </Badge>
                    </div>
                  </div>
                ))}
                {overdueData.data.length > 5 && (
                  <p className="text-xs text-muted-foreground pt-1">
                    +{overdueData.data.length - 5} more overdue loans
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Capital flow */}
      <div className="flex flex-col gap-3">
        <SectionHeader title="Capital Flow" />
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Total inflow (all time)"
            value={formatPeso(summary?.capital.allTime.totalInflow ?? 0)}
            isLoading={summaryLoading}
          />
          <StatCard
            label="Total outflow (all time)"
            value={formatPeso(summary?.capital.allTime.totalOutflow ?? 0)}
            isLoading={summaryLoading}
          />
          <StatCard
            label="Period inflow"
            value={formatPeso(summary?.capital.inPeriod.inflow ?? 0)}
            sub={`Outflow: ${formatPeso(summary?.capital.inPeriod.outflow ?? 0)}`}
            isLoading={summaryLoading}
          />
        </div>
      </div>

    </div>
  )
}
