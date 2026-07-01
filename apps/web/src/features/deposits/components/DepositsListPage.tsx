import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { DepositTable } from '../components/DepositTable'
import { useDeposits } from '../hooks/useDeposits'
import type { DepositStatus, DepositType } from '../types'

export function DepositsListPage() {
  const [status, setStatus] = useState<DepositStatus | undefined>(undefined)
  const [depositType, setDepositType] = useState<DepositType | undefined>(undefined)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageCursors, setPageCursors] = useState<(string | undefined)[]>([undefined])

  const deposits = useDeposits({
    status,
    depositType,
    cursor: pageCursors[pageIndex],
  })
  const nextCursor = deposits.data?.meta.nextCursor ?? null

  function resetPagination() {
    setPageIndex(0)
    setPageCursors([undefined])
  }

  function handleStatusChange(nextStatus: DepositStatus | undefined) {
    setStatus(nextStatus)
    resetPagination()
  }

  function handleTypeChange(nextType: DepositType | undefined) {
    setDepositType(nextType)
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
          <h1 className="text-xl font-semibold">Deposits</h1>
          <p className="text-sm text-muted-foreground">Manage depositor deposits.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* ponytail: New Deposit form lands in Task 11 — button deferred until CreateDepositForm exists */}
        </div>
      </div>
      <Separator />
      <DepositTable
        deposits={deposits}
        statusFilter={status}
        typeFilter={depositType}
        onStatusChange={handleStatusChange}
        onTypeChange={handleTypeChange}
      />
      {deposits.data?.data?.length ? (
        <div className="flex items-center justify-end gap-2">
          <p className="text-sm text-muted-foreground">Page {pageIndex + 1}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={pageIndex === 0 || deposits.isFetching}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!nextCursor || deposits.isFetching}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  )
}
