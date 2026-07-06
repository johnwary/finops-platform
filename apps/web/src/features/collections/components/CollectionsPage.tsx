import { useState } from 'react'
import { format } from 'date-fns'
import { Download04Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
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
import { usePortfolioAtRisk } from '@/features/dashboard/hooks/useDashboard'
import { LOAN_TYPE_LABELS } from '@/features/loans/utils'
import { fetchAllOverdue, useOverdueCollections } from '../hooks/useOverdueCollections'

const SKELETON_ROW_COUNT = 5
const TABLE_COL_COUNT = 8

function riskVariant(daysPastDue: number): 'destructive' | 'secondary' | 'outline' {
  if (daysPastDue >= 90) return 'destructive'
  if (daysPastDue >= 30) return 'secondary'
  return 'outline'
}

export function CollectionsPage() {
  const overdue = useOverdueCollections()
  const par = usePortfolioAtRisk()
  const [isExporting, setIsExporting] = useState(false)
  // meta.total is identical on every page — read it off the first.
  const total = overdue.data?.pages[0]?.meta.total ?? 0

  async function handleExport() {
    setIsExporting(true)
    try {
      const all = await fetchAllOverdue()
      downloadCsv(`collections-${new Date().toISOString().slice(0, 10)}.csv`, all.map((loan) => ({
        borrower: loan.borrower.name,
        phone: loan.borrower.phone,
        email: loan.borrower.email,
        type: LOAN_TYPE_LABELS[loan.type],
        amount: loan.amount,
        remainingBalance: loan.remainingBalance,
        dueSince: loan.earliestOverdueDueDate?.slice(0, 10) ?? '',
        daysPastDue: loan.daysPastDue,
        disbursedAt: loan.disbursedAt?.slice(0, 10) ?? '',
      })))
    } catch {
      toast.error('Failed to export overdue loans.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Collections</h1>
          <p className="text-sm text-muted-foreground">Overdue loan worklist</p>
        </div>
        <Button type="button" variant="outline" onClick={handleExport} disabled={overdue.isPending || isExporting || !total}>
          {isExporting ? <Spinner data-icon="inline-start" /> : <HugeiconsIcon icon={Download04Icon} size={16} />}
          {isExporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Overdue loans</CardDescription>
            {overdue.isPending ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <CardTitle className="text-xl tabular-nums">{total}</CardTitle>
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Outstanding overdue balance</CardDescription>
            {par.isPending ? (
              <Skeleton className="h-6 w-32" />
            ) : (
              <CardTitle className="text-xl tabular-nums">{formatPeso(par.data?.atRiskBalance ?? 0)}</CardTitle>
            )}
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overdue Worklist</CardTitle>
          <CardDescription>Worst cases are sorted first.</CardDescription>
        </CardHeader>
        <CardContent>
          <CollectionsTable overdue={overdue} />
        </CardContent>
      </Card>
    </div>
  )
}

function CollectionsTable({ overdue }: { overdue: ReturnType<typeof useOverdueCollections> }) {
  const rows = overdue.data?.pages.flatMap((page) => page.data) ?? []

  if (overdue.isPending) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Borrower</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Loan Amount</TableHead>
            <TableHead>Remaining</TableHead>
            <TableHead>Due Since</TableHead>
            <TableHead>DPD</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: TABLE_COL_COUNT }).map((__, j) => (
                <TableCell key={j}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  if (overdue.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load overdue loans.</AlertDescription>
      </Alert>
    )
  }

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No overdue loans.</p>
  }

  return (
    <div className="flex flex-col gap-4">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Borrower</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Loan Amount</TableHead>
          <TableHead>Remaining</TableHead>
          <TableHead>Due Since</TableHead>
          <TableHead>DPD</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((loan) => (
          <TableRow key={loan.loanId}>
            <TableCell className="font-medium max-w-40 truncate">{loan.borrower.name}</TableCell>
            <TableCell>
              <div className="flex flex-col">
                <span>{loan.borrower.phone}</span>
                <span className="text-muted-foreground">{loan.borrower.email}</span>
              </div>
            </TableCell>
            <TableCell>{LOAN_TYPE_LABELS[loan.type]}</TableCell>
            <TableCell className="tabular-nums">{formatPeso(loan.amount)}</TableCell>
            <TableCell className="tabular-nums">{formatPeso(loan.remainingBalance)}</TableCell>
            <TableCell className="text-muted-foreground">
              {loan.earliestOverdueDueDate
                ? format(new Date(loan.earliestOverdueDueDate), 'MMM d, yyyy')
                : '-'}
            </TableCell>
            <TableCell>
              <Badge variant={riskVariant(loan.daysPastDue)}>{loan.daysPastDue}d</Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/dashboard/loans/${loan.loanId}`}>View</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
      {overdue.hasNextPage ? (
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={overdue.isFetchingNextPage}
          onClick={() => overdue.fetchNextPage()}
        >
          {overdue.isFetchingNextPage ? <Spinner data-icon="inline-start" /> : null}
          {overdue.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      ) : null}
    </div>
  )
}
