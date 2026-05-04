import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { RequireRole } from '@/features/auth/components/RequireRole'
import { formatPeso } from '@/lib/format'
import { BorrowerLoansList } from './components/BorrowerLoansList'
import { EditBorrowerForm } from './components/EditBorrowerForm'
import { useBorrower } from './hooks/useBorrower'
import { useDeleteBorrower } from './hooks/useDeleteBorrower'
import type { BorrowerDetail } from './types'
import { GENDER_LABELS, ID_TYPE_LABELS, INCOME_SOURCE_LABELS, formatPhone } from './utils'

export function BorrowerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const borrower = useBorrower(id)

  const [isEditOpen, setIsEditOpen] = useState(false)

  const deleteBorrower = useDeleteBorrower()

  if (borrower.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (borrower.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {borrower.error.message ?? 'Failed to load borrower.'}
        </AlertDescription>
      </Alert>
    )
  }

  const data = borrower.data
  if (!data) return null

  const hasLoans = data.loans.length > 0

  function handleDelete() {
    deleteBorrower.mutate(data.id, {
      onSuccess: () => navigate('/dashboard/borrowers'),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Borrower
          </p>
          <h1 className="text-2xl font-semibold">{data.name}</h1>
          <p className="text-sm text-muted-foreground">{data.email}</p>
        </div>

        <RequireRole role={['admin', 'manager']} fallback="hide">
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" onClick={() => setIsEditOpen(true)}>
              Edit
            </Button>
            <RequireRole role="admin" fallback="hide">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteBorrower.isPending || hasLoans}
                title={hasLoans ? 'Cannot delete: borrower has loans' : undefined}
              >
                {deleteBorrower.isPending ? <Spinner data-icon="inline-start" /> : null}
                Delete
              </Button>
            </RequireRole>
          </div>
        </RequireRole>
      </div>

      {/* Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BorrowerDetailsCard borrower={data} />
        <BorrowerExtrasCard borrower={data} />
      </div>

      {/* Loans */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground pb-1.5 mb-3 border-b">
          Loans ({data.loans.length})
        </h2>
        <BorrowerLoansList loans={data.loans} />
      </div>

      {/* Edit sheet */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent className="sm:max-w-lg flex flex-col p-0">
          <SheetHeader className="p-6 pb-0">
            <SheetTitle>Edit Borrower</SheetTitle>
            <SheetDescription>Update borrower profile.</SheetDescription>
          </SheetHeader>
          <EditBorrowerForm borrower={data} onSuccess={() => setIsEditOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}

function BorrowerDetailsCard({ borrower }: { borrower: BorrowerDetail }) {
  return (
    <div className="flex flex-col gap-5">
      <DetailsGroup label="Identity">
        <DetailRow label="Email" value={borrower.email} />
        <DetailRow label="Phone" value={formatPhone(borrower.phone)} />
        <StackedRow label="Address" value={borrower.address} />
      </DetailsGroup>

      <DetailsGroup label="KYC">
        <DetailRow
          label="Date of birth"
          value={format(new Date(borrower.dateOfBirth), 'MMM d, yyyy')}
        />
        <DetailRow label="Gender" value={GENDER_LABELS[borrower.gender]} />
        <DetailRow label="ID type" value={ID_TYPE_LABELS[borrower.idType]} />
        <DetailRow label="ID number" value={borrower.idNumber} />
      </DetailsGroup>
    </div>
  )
}

function BorrowerExtrasCard({ borrower }: { borrower: BorrowerDetail }) {
  const hasEmergency = borrower.emergencyContactName || borrower.emergencyContactPhone

  return (
    <div className="flex flex-col gap-5">
      <DetailsGroup label="Income">
        <DetailRow label="Source" value={INCOME_SOURCE_LABELS[borrower.incomeSource]} />
        {borrower.occupation && <DetailRow label="Occupation" value={borrower.occupation} />}
        {borrower.monthlyIncome && (
          <DetailRow label="Monthly income" value={formatPeso(borrower.monthlyIncome)} />
        )}
      </DetailsGroup>

      {hasEmergency && (
        <DetailsGroup label="Emergency contact">
          {borrower.emergencyContactName && (
            <DetailRow label="Name" value={borrower.emergencyContactName} />
          )}
          {borrower.emergencyContactPhone && (
            <DetailRow label="Phone" value={formatPhone(borrower.emergencyContactPhone)} />
          )}
        </DetailsGroup>
      )}

      {borrower.notes && (
        <DetailsGroup label="Notes">
          <StackedRow label="Notes" value={borrower.notes} />
        </DetailsGroup>
      )}
    </div>
  )
}

function DetailsGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-foreground pb-1.5 mb-2 border-b">
        {label}
      </p>
      <dl className="flex flex-col gap-2 text-sm">{children}</dl>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  )
}

function StackedRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium leading-snug">{value}</dd>
    </div>
  )
}
