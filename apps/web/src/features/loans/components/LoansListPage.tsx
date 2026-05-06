import { useState } from 'react'
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
import { useDebounce } from '@/hooks/use-debounce'
import { CreateLoanForm } from '../components/CreateLoanForm'
import { LoanTable } from '../components/LoanTable'
import { useLoans } from '../hooks/useLoans'
import type { LoanStatus, LoanType } from '../types'

export function LoansListPage() {
  const [status, setStatus] = useState<LoanStatus | undefined>(undefined)
  const [type, setType] = useState<LoanType | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageCursors, setPageCursors] = useState<(string | undefined)[]>([undefined])

  const debouncedSearch = useDebounce(search)
  const isSearchPending = search !== debouncedSearch
  const loans = useLoans({
    status,
    type,
    search: debouncedSearch || undefined,
    cursor: pageCursors[pageIndex],
  })
  const nextCursor = loans.data?.meta.nextCursor ?? null

  function resetPagination() {
    setPageIndex(0)
    setPageCursors([undefined])
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Loans</h1>
          <p className="text-sm text-muted-foreground">Manage borrower loans.</p>
        </div>
        <RequireRole role={['admin', 'manager']} fallback="hide">
          <Button onClick={() => setIsCreateOpen(true)}>New Loan</Button>
        </RequireRole>
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
