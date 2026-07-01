import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useDebounce } from '@/hooks/use-debounce'
import { DepositorTable } from '../components/DepositorTable'
import { useDepositors } from '../hooks/useDepositors'

export function DepositorsListPage() {
  const [search, setSearch] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageCursors, setPageCursors] = useState<(string | undefined)[]>([undefined])

  const debouncedSearch = useDebounce(search)
  const isSearchPending = search !== debouncedSearch
  const depositors = useDepositors({
    search: debouncedSearch || undefined,
    cursor: pageCursors[pageIndex],
  })
  const nextCursor = depositors.data?.meta.nextCursor ?? null

  function resetPagination() {
    setPageIndex(0)
    setPageCursors([undefined])
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
          <h1 className="text-xl font-semibold">Depositors</h1>
          <p className="text-sm text-muted-foreground">Manage depositor profiles.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* ponytail: New Depositor form lands in Task 5 — button deferred until CreateDepositorForm exists */}
        </div>
      </div>
      <Separator />
      <DepositorTable
        depositors={depositors}
        search={search}
        isSearchPending={isSearchPending}
        onSearchChange={handleSearchChange}
      />
      {depositors.data?.data?.length ? (
        <div className="flex items-center justify-end gap-2">
          <p className="text-sm text-muted-foreground">Page {pageIndex + 1}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={pageIndex === 0 || depositors.isFetching}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!nextCursor || depositors.isFetching}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  )
}
