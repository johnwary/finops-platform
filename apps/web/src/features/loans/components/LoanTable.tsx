import { format } from 'date-fns'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { useLoans } from '../hooks/useLoans'
import type { LoanStatus, LoanType } from '../types'
import { formatBorrowerName } from '@/features/borrowers/utils'
import { formatPeso, formatPercent } from '@/lib/format'
import { LOAN_STATUS_LABELS, LOAN_TYPE_LABELS } from '../utils'
import { LoanStatusBadge } from './LoanStatusBadge'

interface LoanTableProps {
  loans: ReturnType<typeof useLoans>
  statusFilter: LoanStatus | undefined
  typeFilter: LoanType | undefined
  search: string
  isSearchPending: boolean
  onStatusChange: (status: LoanStatus | undefined) => void
  onTypeChange: (type: LoanType | undefined) => void
  onSearchChange: (search: string) => void
  restoreAction?: (id: string) => void
  isRestoring?: boolean
  restoringId?: string
}

const LOAN_STATUSES: LoanStatus[] = ['PENDING', 'APPROVED', 'ACTIVE', 'PAID', 'CANCELED', 'DEFAULTED']
const LOAN_TYPES: LoanType[] = ['SALARY', 'BUSINESS', 'PERSONAL', 'PURCHASE_ORDER', 'PENSION', 'INVESTMENT']
const ALL_STATUSES_VALUE = 'ALL_STATUSES'
const ALL_TYPES_VALUE = 'ALL_TYPES'
const SKELETON_ROW_COUNT = 5
const TABLE_COL_COUNT = 9

export function LoanTable({ loans, statusFilter, typeFilter, search, isSearchPending, onStatusChange, onTypeChange, onSearchChange, restoreAction, isRestoring, restoringId }: LoanTableProps) {
  const isRefetching = isSearchPending || (loans.isFetching && !loans.isPending)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={statusFilter ?? ALL_STATUSES_VALUE}
          onValueChange={(val) => onStatusChange(val === ALL_STATUSES_VALUE ? undefined : val as LoanStatus)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES_VALUE}>All statuses</SelectItem>
            {LOAN_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{LOAN_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={typeFilter ?? ALL_TYPES_VALUE}
          onValueChange={(val) => onTypeChange(val === ALL_TYPES_VALUE ? undefined : val as LoanType)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TYPES_VALUE}>All types</SelectItem>
            {LOAN_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{LOAN_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="search"
          placeholder="Search borrower…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-64"
        />
        {isRefetching && <Spinner className="text-muted-foreground" />}
      </div>

      <LoanTableContent loans={loans} restoreAction={restoreAction} isRestoring={isRestoring} restoringId={restoringId} />
    </div>
  )
}

interface LoanTableContentProps {
  loans: ReturnType<typeof useLoans>
  restoreAction?: (id: string) => void
  isRestoring?: boolean
  restoringId?: string
}

function LoanTableContent({ loans, restoreAction, isRestoring, restoringId }: LoanTableContentProps) {
  const [pendingRestoreId, setPendingRestoreId] = useState<string | null>(null)
  const pendingLoan = loans.data?.data.find((l) => l.id === pendingRestoreId)

  if (loans.isPending) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Borrower</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead>Term</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Remaining</TableHead>
            <TableHead>Disbursed</TableHead>
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

  if (loans.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load loans.</AlertDescription>
      </Alert>
    )
  }

  if (!loans.data?.data?.length) {
    return <p className="text-sm text-muted-foreground">No loans found.</p>
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Borrower</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead>Term</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Remaining</TableHead>
            <TableHead>Disbursed</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.data.data.map((loan) => (
            <TableRow key={loan.id}>
              <TableCell className="font-medium max-w-32 truncate">{formatBorrowerName(loan.borrower)}</TableCell>
              <TableCell>{LOAN_TYPE_LABELS[loan.type]}</TableCell>
              <TableCell className="tabular-nums">{formatPeso(loan.amount)}</TableCell>
              <TableCell className="tabular-nums">{formatPercent(loan.interestRate)}</TableCell>
              <TableCell>{loan.termMonths}mo</TableCell>
              <TableCell><LoanStatusBadge status={loan.status} /></TableCell>
              <TableCell className="tabular-nums">{formatPeso(loan.remainingBalance)}</TableCell>
              <TableCell className="text-muted-foreground">
                {loan.disbursedAt ? format(new Date(loan.disbursedAt), 'MMM d, yyyy') : '—'}
              </TableCell>
              <TableCell className="text-right">
                {restoreAction ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isRestoring}
                    onClick={() => setPendingRestoreId(loan.id)}
                  >
                    {isRestoring && restoringId === loan.id ? (
                      <Spinner data-icon="inline-start" />
                    ) : null}
                    Restore
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/dashboard/loans/${loan.id}`}>View</Link>
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog
        open={!!pendingRestoreId}
        onOpenChange={(open) => { if (!open) setPendingRestoreId(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore loan?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingLoan
                ? <>Restore the loan for <span className="font-semibold text-foreground">{formatBorrowerName(pendingLoan.borrower)}</span>? It will appear as an active loan again.</>
                : 'This loan will be restored as active.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isRestoring}
              onClick={() => {
                if (pendingRestoreId && restoreAction) {
                  restoreAction(pendingRestoreId)
                  setPendingRestoreId(null)
                }
              }}
            >
              {isRestoring ? <Spinner data-icon="inline-start" /> : null}
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
