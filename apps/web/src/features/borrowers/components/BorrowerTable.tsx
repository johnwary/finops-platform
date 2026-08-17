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
import { TableSkeletonBody } from '@/components/ui/table-skeleton'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useBorrowers } from '../hooks/useBorrowers'
import { ID_TYPE_LABELS, formatBorrowerName, formatPhone, maskIdNumber } from '../utils'

interface BorrowerTableProps {
  borrowers: ReturnType<typeof useBorrowers>
  search: string
  isSearchPending: boolean
  onSearchChange: (search: string) => void
  restoreAction?: (id: string) => void
  isRestoring?: boolean
  restoringId?: string
}

const TABLE_COL_COUNT = 7

export function BorrowerTable({
  borrowers,
  search,
  isSearchPending,
  onSearchChange,
  restoreAction,
  isRestoring,
  restoringId,
}: BorrowerTableProps) {
  const isRefetching = isSearchPending || (borrowers.isFetching && !borrowers.isPending)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          type="search"
          placeholder="Search name, email, or phone…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-64"
        />
        {isRefetching && <Spinner className="text-muted-foreground" />}
      </div>

      <BorrowerTableContent
        borrowers={borrowers}
        restoreAction={restoreAction}
        isRestoring={isRestoring}
        restoringId={restoringId}
      />
    </div>
  )
}

// Percentage widths, not fixed rem: under table-fixed a fixed total wider than the
// container clips the last column instead of letting the table shrink to fit.
function BorrowerTableColGroup() {
  return (
    <colgroup>
      <col className="w-[19%]" />
      <col className="w-[22%]" />
      <col className="w-[14%]" />
      <col className="w-[18%]" />
      <col className="w-[7%]" />
      <col className="w-[12%]" />
      <col className="w-[8%]" />
    </colgroup>
  )
}

function BorrowerTableHead() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Phone</TableHead>
        <TableHead>ID</TableHead>
        <TableHead>Loans</TableHead>
        <TableHead>Created</TableHead>
        <TableHead />
      </TableRow>
    </TableHeader>
  )
}

interface BorrowerTableContentProps {
  borrowers: ReturnType<typeof useBorrowers>
  restoreAction?: (id: string) => void
  isRestoring?: boolean
  restoringId?: string
}

function BorrowerTableContent({ borrowers, restoreAction, isRestoring, restoringId }: BorrowerTableContentProps) {
  const [pendingRestoreId, setPendingRestoreId] = useState<string | null>(null)
  const pendingBorrower = borrowers.data?.data.find((b) => b.id === pendingRestoreId)

  if (borrowers.isPending) {
    return (
      <Table className="table-fixed">
        <BorrowerTableColGroup />
        <BorrowerTableHead />
        <TableSkeletonBody columnCount={TABLE_COL_COUNT} />
      </Table>
    )
  }

  if (borrowers.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load borrowers.</AlertDescription>
      </Alert>
    )
  }

  if (!borrowers.data?.data?.length) {
    return <p className="text-sm text-muted-foreground">No borrowers found.</p>
  }

  return (
    <>
      <Table className="table-fixed">
        <BorrowerTableColGroup />
        <BorrowerTableHead />
        <TableBody>
          {borrowers.data.data.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="font-medium truncate">{formatBorrowerName(b)}</TableCell>
              <TableCell className="truncate">{b.email}</TableCell>
              <TableCell className="tabular-nums">{formatPhone(b.phone)}</TableCell>
              <TableCell className="truncate">
                <span className="text-muted-foreground text-xs mr-1">{ID_TYPE_LABELS[b.idType]}</span>
                <span className="tabular-nums">{maskIdNumber(b.idNumber)}</span>
              </TableCell>
              <TableCell className="tabular-nums">{b.loanCount}</TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(b.createdAt), 'MMM d, yyyy')}
              </TableCell>
              <TableCell className="text-right">
                {restoreAction ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isRestoring}
                    onClick={() => setPendingRestoreId(b.id)}
                  >
                    {isRestoring && restoringId === b.id ? (
                      <Spinner data-icon="inline-start" />
                    ) : null}
                    Restore
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/dashboard/borrowers/${b.id}`}>View</Link>
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
            <AlertDialogTitle>Restore borrower?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBorrower
                ? <>Restore <span className="font-semibold text-foreground">{formatBorrowerName(pendingBorrower)}</span>? They will appear as an active borrower again.</>
                : 'This borrower will be restored as active.'}
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
