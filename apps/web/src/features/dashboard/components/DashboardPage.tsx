import { useState } from 'react'
import { format } from 'date-fns'
import { Navigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton, SkeletonText } from '@/components/ui/skeleton'
import { formatNumber, formatPeso } from '@/lib/format'
import { useSession } from '@/features/auth/hooks/useSession'
import { useDashboardSummary, useOverdue, usePortfolioAtRisk } from '../hooks/useDashboard'
import { PERIODS } from '../types'
import type { ReportPeriod } from '../types'

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
        <CardTitle className="text-xl font-semibold tabular-nums">
          {isLoading ? <SkeletonText width="60%" /> : value}
        </CardTitle>
        {sub && (
          <p className="text-xs text-muted-foreground">
            {isLoading ? <SkeletonText width="45%" /> : sub}
          </p>
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
  const session = useSession()
  const role = session.data?.user.role

  if (session.isPending) return null
  if (role === 'user') return <Navigate to="/dashboard/loans" replace />

  return <ManagerDashboard />
}

function ManagerDashboard() {
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
        <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {(
            [
              ['Pending',     summary?.loans.byStatus.pending,    'outline'],
              ['Approved',    summary?.loans.byStatus.approved,   'secondary'],
              ['Active',      summary?.loans.byStatus.active,     'default'],
              ['In Arrears',  summary?.loans.byStatus.inArrears,  'destructive'],
              ['Paid',        summary?.loans.byStatus.paid,       'default'],
              ['Defaulted',   summary?.loans.byStatus.defaulted,  'destructive'],
              ['Written Off', summary?.loans.byStatus.writtenOff, 'outline'],
              ['Canceled',    summary?.loans.byStatus.canceled,   'outline'],
            ] as const
          ).map(([label, stat, variant]) => (
            <Card key={label}>
              <CardHeader>
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-lg tabular-nums">
                  {summaryLoading ? (
                    <SkeletonText width="2.5rem" />
                  ) : (
                    formatNumber(stat?.count ?? 0)
                  )}
                </CardTitle>
                {summaryLoading ? (
                  <Skeleton className="h-5 w-20 rounded-full" />
                ) : (
                  <Badge variant={variant} className="w-fit">
                    {formatPeso(stat?.amount ?? 0)}
                  </Badge>
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
              <span className="text-2xl font-semibold tabular-nums">
                {parLoading ? (
                  <SkeletonText width="4.5rem" />
                ) : (
                  `${par?.parRatio ?? '0.00'}%`
                )}
              </span>
              {parLoading ? (
                <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
              ) : (
                <Badge variant={parVariant}>
                  {parNum >= 10 ? 'High risk' : parNum >= 5 ? 'Watch' : 'Healthy'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Total portfolio</p>
                <p className="font-medium tabular-nums">
                  {parLoading ? <SkeletonText width="80%" /> : formatPeso(par?.totalPortfolioBalance ?? 0)}
                </p>
                <p className="text-muted-foreground mt-0.5">
                  {parLoading ? <SkeletonText width="55%" /> : `${formatNumber(par?.totalPortfolioCount ?? 0)} loans`}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">At risk balance</p>
                <p className="font-medium tabular-nums text-destructive">
                  {parLoading ? <SkeletonText width="80%" /> : formatPeso(par?.atRiskBalance ?? 0)}
                </p>
                <p className="text-muted-foreground mt-0.5">
                  {parLoading ? <SkeletonText width="55%" /> : `${formatNumber(par?.atRiskCount ?? 0)} loans`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overdue loans */}
        <Card>
          <CardHeader>
            <CardDescription>Overdue Loans</CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {overdueLoading ? (
                <SkeletonText width="3rem" />
              ) : (
                formatNumber(overdueData?.meta.total ?? 0)
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdueLoading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        <SkeletonText width="55%" />
                      </p>
                      <p className="text-muted-foreground">
                        <SkeletonText width="35%" />
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <p className="font-medium tabular-nums">
                        <SkeletonText width="5rem" />
                      </p>
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </div>
                  </div>
                ))}
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
