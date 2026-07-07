import { useState } from 'react'
import { Download04Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { RequireRole } from '@/features/auth/components/RequireRole'
import { useSession } from '@/features/auth/hooks/useSession'
import { useDebounce } from '@/hooks/use-debounce'
import { apiFetchAllList } from '@/lib/api'
import { downloadCsv } from '@/lib/csv'
import { CreateLoanForm } from '../components/CreateLoanForm'
import { LoanTable } from '../components/LoanTable'
import { useLoans } from '../hooks/useLoans'
import { useRestoreLoan } from '../hooks/useRestoreLoan'
import type { Loan, LoanStatus, LoanType } from '../types'
import { formatBorrowerName } from '@/features/borrowers/utils'
import { LOAN_STATUS_LABELS, LOAN_TYPE_LABELS } from '../utils'

export function LoansListPage() {
  const session = useSession()
  const isAdmin = session.data?.user.role === 'admin'

  const [status, setStatus] = useState<LoanStatus | undefined>(undefined)
  const [type, setType] = useState<LoanType | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageCursors, setPageCursors] = useState<(string | undefined)[]>([undefined])

  const debouncedSearch = useDebounce(search)
  const isSearchPending = search !== debouncedSearch
  const loans = useLoans({
    status,
    type,
    search: debouncedSearch || undefined,
    cursor: pageCursors[pageIndex],
    deleted: showDeleted || undefined,
  })
  const nextCursor = loans.data?.meta.nextCursor ?? null

  const restoreLoan = useRestoreLoan()

  function resetPagination() {
    setPageIndex(0)
    setPageCursors([undefined])
  }

  function handleToggleDeleted() {
    setShowDeleted((prev) => !prev)
    setStatus(undefined)
    setType(undefined)
    setSearch('')
    resetPagination()
  }

  function handleRestore(id: string) {
    restoreLoan.mutate(id, {
      onSuccess: () => {
        setShowDeleted(false)
        resetPagination()
      },
    })
  }

  function handleStatusChange(nextStatus: LoanStatus | undefined) {
    setStatus(nextStatus)
    resetPagination()
  }

  function handleTypeChange(nextType: LoanType | undefined) {
    setType(nextType)
    resetPagination()
  }

  function handleSearchChange(nextSearch: string) {
    setSearch(nextSearch)
    resetPagination()
  }

  function handleNextPage() {
    if (!nextCursor) return
    setPageCursors((cursors) => {
      const nextCursors = cursors.slice(0, pageIndex + 1)
      nextCursors[pageIndex + 1] = nextCursor
      return nextCursors
    })
    setPageIndex((current) => current + 1)
  }

  function handlePreviousPage() {
    setPageIndex((current) => Math.max(0, current - 1))
  }

  async function handleExport() {
    setIsExporting(true)
    try {
      const query = new URLSearchParams({ limit: '100' })
      if (status) query.set('status', status)
      if (type) query.set('type', type)
      if (debouncedSearch) query.set('search', debouncedSearch)

      const all = await apiFetchAllList<Loan>(`/api/v1/loans?${query}`)
      downloadCsv(`loans-${new Date().toISOString().slice(0, 10)}.csv`, all.map((loan) => ({
        borrower: formatBorrowerName(loan.borrower),
        type: LOAN_TYPE_LABELS[loan.type],
        amount: loan.amount,
        interestRate: loan.interestRate,
        termMonths: loan.termMonths,
        status: LOAN_STATUS_LABELS[loan.status],
        remainingBalance: loan.remainingBalance,
        totalPaid: loan.totalPaid,
        applicationDate: loan.applicationDate.slice(0, 10),
        disbursedAt: loan.disbursedAt?.slice(0, 10) ?? '',
        endDate: loan.endDate?.slice(0, 10) ?? '',
      })))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Loans</h1>
          <p className="text-sm text-muted-foreground">Manage borrower loans.</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant={showDeleted ? 'secondary' : 'outline'}
              size="sm"
              onClick={handleToggleDeleted}
            >
              {showDeleted ? 'Show active' : 'Show deleted'}
            </Button>
          )}
          {!showDeleted && (
            <Button type="button" variant="outline" onClick={handleExport} disabled={isExporting || loans.isPending || !loans.data?.data.length}>
              <HugeiconsIcon icon={Download04Icon} size={16} />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          )}
          <RequireRole role={['admin', 'manager']} fallback="hide">
            {!showDeleted && (
              <Button onClick={() => setIsCreateOpen(true)}>New Loan</Button>
            )}
          </RequireRole>
        </div>
      </div>
      <Separator />
      <LoanTable
        loans={loans}
        statusFilter={status}
        typeFilter={type}
        search={search}
        isSearchPending={isSearchPending}
        onStatusChange={handleStatusChange}
        onTypeChange={handleTypeChange}
        onSearchChange={handleSearchChange}
        restoreAction={showDeleted ? handleRestore : undefined}
        isRestoring={restoreLoan.isPending}
        restoringId={restoreLoan.variables}
      />
      {loans.data?.data?.length ? (
        <div className="flex items-center justify-end gap-2">
          <p className="text-sm text-muted-foreground">Page {pageIndex + 1}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={pageIndex === 0 || loans.isFetching}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!nextCursor || loans.isFetching}
          >
            Next
          </Button>
        </div>
      ) : null}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent className="sm:max-w-lg flex flex-col p-0">
          <SheetHeader className="p-6 pb-0">
            <SheetTitle>New Loan</SheetTitle>
            <SheetDescription>Create a new loan application.</SheetDescription>
          </SheetHeader>
          <CreateLoanForm onSuccess={() => setIsCreateOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
