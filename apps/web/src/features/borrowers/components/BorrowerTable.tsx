import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
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
import { useBorrowers } from '../hooks/useBorrowers'
import { ID_TYPE_LABELS, formatBorrowerName, formatPhone, maskIdNumber } from '../utils'

interface BorrowerTableProps {
  borrowers: ReturnType<typeof useBorrowers>
  search: string
  isSearchPending: boolean
  onSearchChange: (search: string) => void
}

const SKELETON_ROW_COUNT = 5
const TABLE_COL_COUNT = 7

export function BorrowerTable({
  borrowers,
  search,
  isSearchPending,
  onSearchChange,
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

      <BorrowerTableContent borrowers={borrowers} />
    </div>
  )
}

function BorrowerTableContent({ borrowers }: { borrowers: ReturnType<typeof useBorrowers> }) {
  if (borrowers.isPending) {
    return (
      <Table>
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
    <Table>
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
      <TableBody>
        {borrowers.data.data.map((b) => (
          <TableRow key={b.id}>
            <TableCell className="font-medium max-w-48 truncate">{formatBorrowerName(b)}</TableCell>
            <TableCell className="max-w-48 truncate">{b.email}</TableCell>
            <TableCell className="tabular-nums">{formatPhone(b.phone)}</TableCell>
            <TableCell>
              <span className="text-muted-foreground text-xs mr-1">{ID_TYPE_LABELS[b.idType]}</span>
              <span className="tabular-nums">{maskIdNumber(b.idNumber)}</span>
            </TableCell>
            <TableCell className="tabular-nums">{b._count.loans}</TableCell>
            <TableCell className="text-muted-foreground">
              {format(new Date(b.createdAt), 'MMM d, yyyy')}
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/dashboard/borrowers/${b.id}`}>View</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
