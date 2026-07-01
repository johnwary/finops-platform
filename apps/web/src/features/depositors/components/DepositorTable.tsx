import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
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
import { useDepositors } from '../hooks/useDepositors'

interface DepositorTableProps {
  depositors: ReturnType<typeof useDepositors>
  search: string
  isSearchPending: boolean
  onSearchChange: (search: string) => void
}

const SKELETON_ROW_COUNT = 5
const TABLE_COL_COUNT = 5

export function DepositorTable({
  depositors,
  search,
  isSearchPending,
  onSearchChange,
}: DepositorTableProps) {
  const isRefetching = isSearchPending || (depositors.isFetching && !depositors.isPending)

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

      <DepositorTableContent depositors={depositors} />
    </div>
  )
}

function DepositorTableColGroup() {
  return (
    <colgroup>
      <col className="w-48" />
      <col className="w-48" />
      <col className="w-36" />
      <col className="w-20" />
      <col className="w-32" />
    </colgroup>
  )
}

function DepositorTableHead() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Phone</TableHead>
        <TableHead>Deposits</TableHead>
        <TableHead>Created</TableHead>
      </TableRow>
    </TableHeader>
  )
}

interface DepositorTableContentProps {
  depositors: ReturnType<typeof useDepositors>
}

function DepositorTableContent({ depositors }: DepositorTableContentProps) {
  if (depositors.isPending) {
    return (
      <Table className="table-fixed">
        <DepositorTableColGroup />
        <DepositorTableHead />
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

  if (depositors.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load depositors.</AlertDescription>
      </Alert>
    )
  }

  if (!depositors.data?.data?.length) {
    return <p className="text-sm text-muted-foreground">No depositors found.</p>
  }

  return (
    <Table className="table-fixed">
      <DepositorTableColGroup />
      <DepositorTableHead />
      <TableBody>
        {depositors.data.data.map((d) => (
          <TableRow key={d.id}>
            <TableCell className="font-medium truncate">
              <Link to={`/dashboard/depositors/${d.id}`} className="hover:underline">
                {d.name}
              </Link>
            </TableCell>
            <TableCell className="truncate">{d.email}</TableCell>
            <TableCell className="tabular-nums">{d.phone}</TableCell>
            <TableCell className="tabular-nums">{d.depositCount}</TableCell>
            <TableCell className="text-muted-foreground">
              {format(new Date(d.createdAt), 'MMM d, yyyy')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
