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
import { useSession } from '@/features/auth/hooks/useSession'
import { useDebounce } from '@/hooks/use-debounce'
import { BorrowerTable } from '../components/BorrowerTable'
import { CreateBorrowerForm } from '../components/CreateBorrowerForm'
import { useBorrowers } from '../hooks/useBorrowers'
import { useRestoreBorrower } from '../hooks/useRestoreBorrower'

export function BorrowersListPage() {
  const session = useSession()
  const isAdmin = session.data?.user.role === 'admin'

  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageCursors, setPageCursors] = useState<(string | undefined)[]>([undefined])

  const debouncedSearch = useDebounce(search)
  const isSearchPending = search !== debouncedSearch
  const borrowers = useBorrowers({
    search: debouncedSearch || undefined,
    cursor: pageCursors[pageIndex],
    deleted: showDeleted || undefined,
  })
  const nextCursor = borrowers.data?.meta.nextCursor ?? null

  const restoreBorrower = useRestoreBorrower()

  function resetPagination() {
    setPageIndex(0)
    setPageCursors([undefined])
  }

  function handleSearchChange(nextSearch: string) {
    setSearch(nextSearch)
    resetPagination()
  }

  function handleToggleDeleted() {
    setShowDeleted((prev) => !prev)
    setSearch('')
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

  function handleRestore(id: string) {
    restoreBorrower.mutate(id, {
      onSuccess: () => {
        setShowDeleted(false)
        resetPagination()
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Borrowers</h1>
          <p className="text-sm text-muted-foreground">Manage borrower profiles.</p>
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
          <RequireRole role={['admin', 'manager']} fallback="hide">
            {!showDeleted && (
              <Button onClick={() => setIsCreateOpen(true)}>New Borrower</Button>
            )}
          </RequireRole>
        </div>
      </div>
      <Separator />
      <BorrowerTable
        borrowers={borrowers}
        search={search}
        isSearchPending={isSearchPending}
        onSearchChange={handleSearchChange}
        restoreAction={showDeleted ? handleRestore : undefined}
        isRestoring={restoreBorrower.isPending}
        restoringId={restoreBorrower.variables}
      />
      {borrowers.data?.data?.length ? (
        <div className="flex items-center justify-end gap-2">
          <p className="text-sm text-muted-foreground">Page {pageIndex + 1}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={pageIndex === 0 || borrowers.isFetching}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!nextCursor || borrowers.isFetching}
          >
            Next
          </Button>
        </div>
      ) : null}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent className="sm:max-w-lg flex flex-col p-0">
          <SheetHeader className="p-6 pb-0">
            <SheetTitle>New Borrower</SheetTitle>
            <SheetDescription>Create a new borrower profile.</SheetDescription>
          </SheetHeader>
          <CreateBorrowerForm onSuccess={() => setIsCreateOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
