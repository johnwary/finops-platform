import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { appRoutes } from '@/lib/app-routes'
import { format, parseISO } from 'date-fns'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DisabledReasonTooltip } from '@/components/ui/disabled-reason-tooltip'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SkeletonText } from '@/components/ui/skeleton'
import { DetailPageSkeleton } from '@/components/ui/detail-page-skeleton'
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
import { BorrowerLoansList } from '../components/BorrowerLoansList'
import { EditBorrowerForm } from '../components/EditBorrowerForm'
import { useBorrower } from '../hooks/useBorrower'
import { useBorrowerActivity } from '../hooks/useBorrowerActivity'
import { useDeleteBorrower } from '../hooks/useDeleteBorrower'
import type { BorrowerActivityItem, BorrowerDetail } from '../types'
import {
  GENDER_LABELS,
  ID_TYPE_LABELS,
  INCOME_SOURCE_LABELS,
  formatBorrowerName,
  formatPhone,
} from '../utils'

const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  BORROWER_CREATED: 'Created',
  BORROWER_UPDATED: 'Updated',
  BORROWER_DELETED: 'Deleted',
  BORROWER_RESTORED: 'Restored',
}

export function BorrowerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const borrower = useBorrower(id)
  const activity = useBorrowerActivity(id)

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const deleteBorrower = useDeleteBorrower()

  if (borrower.isPending) {
    return <DetailPageSkeleton />
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
  const activeLoanCount = data.loans.filter((loan) => (
    loan.status === 'PENDING' ||
    loan.status === 'APPROVED' ||
    loan.status === 'ACTIVE' ||
    loan.status === 'IN_ARREARS'
  )).length
  const arrearsLoanCount = data.loans.filter((loan) => loan.status === 'IN_ARREARS').length
  const totalRemaining = data.loans.reduce((sum, loan) => sum + Number(loan.remainingBalance), 0)

  function handleDelete() {
    deleteBorrower.mutate(data.id, {
      onSuccess: () => {
        setIsDeleteOpen(false)
        navigate(appRoutes.borrowers.path)
      },
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
          <h1 className="text-2xl font-semibold">{formatBorrowerName(data)}</h1>
          <p className="text-sm text-muted-foreground">{data.email}</p>
        </div>

        <RequireRole role={['admin', 'manager']} fallback="hide">
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" onClick={() => setIsEditOpen(true)}>
              Edit
            </Button>
            <RequireRole role="admin" fallback="hide">
              <DisabledReasonTooltip
                reason={hasLoans ? "Can't delete - this borrower has existing loans." : undefined}
              >
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setIsDeleteOpen(true)}
                  disabled={deleteBorrower.isPending || hasLoans}
                >
                  {deleteBorrower.isPending ? <Spinner data-icon="inline-start" /> : null}
                  Delete
                </Button>
              </DisabledReasonTooltip>
            </RequireRole>
          </div>
        </RequireRole>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <BorrowerStatCard label="Total loans" value={String(data.loans.length)} />
        <BorrowerStatCard label="Active loans" value={String(activeLoanCount)} />
        <BorrowerStatCard label="In arrears" value={String(arrearsLoanCount)} />
        <BorrowerStatCard label="Remaining balance" value={formatPeso(totalRemaining)} />
      </div>

      {/* Details */}
      <BorrowerDetailsGrid borrower={data} />

      {/* Loans */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground pb-1.5 mb-3 border-b">
          Loans ({data.loans.length})
        </h2>
        <BorrowerLoansList loans={data.loans} />
      </div>

      {/* Activity */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground pb-1.5 mb-3 border-b">
          Activity
        </h2>
        <BorrowerActivityLog activity={activity} />
      </div>

      {/* Delete confirmation */}
      <DeleteBorrowerDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        borrowerName={formatBorrowerName(data)}
        isPending={deleteBorrower.isPending}
        onConfirm={handleDelete}
      />

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

function BorrowerStatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function BorrowerActivityLog({ activity }: { activity: ReturnType<typeof useBorrowerActivity> }) {
  if (activity.isPending) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start justify-between gap-4 text-sm">
            <SkeletonText width="9rem" />
            <SkeletonText className="shrink-0" width="6rem" />
          </div>
        ))}
      </div>
    )
  }

  if (activity.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load activity.</AlertDescription>
      </Alert>
    )
  }

  const items = activity.data?.data ?? []

  if (!items.length) {
    return <p className="text-sm text-muted-foreground">No activity on record.</p>
  }

  return (
    <ol className="flex flex-col gap-2">
      {items.map((item: BorrowerActivityItem) => (
        <li key={item.id} className="flex items-start justify-between gap-4 text-sm">
          <span className="font-medium">
            {ACTIVITY_ACTION_LABELS[item.action] ?? item.action}
          </span>
          <span className="text-muted-foreground tabular-nums shrink-0">
            {format(parseISO(item.createdAt), 'MMM d, yyyy h:mm a')}
          </span>
        </li>
      ))}
    </ol>
  )
}

function BorrowerDetailsGrid({ borrower }: { borrower: BorrowerDetail }) {
  const hasEmergency = borrower.emergencyContactName || borrower.emergencyContactPhone

  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:gap-x-6">
      <DetailsGroup label="Identity">
        <DetailRow label="Email" value={borrower.email} />
        <DetailRow label="Phone" value={formatPhone(borrower.phone)} />
        <DetailRow label="Address" value={borrower.address} />
      </DetailsGroup>

      <DetailsGroup label="Income">
        <DetailRow label="Source" value={INCOME_SOURCE_LABELS[borrower.incomeSource]} />
        {borrower.occupation && <DetailRow label="Occupation" value={borrower.occupation} />}
        {borrower.monthlyIncome != null && (
          <DetailRow label="Monthly income" value={formatPeso(borrower.monthlyIncome)} />
        )}
      </DetailsGroup>

      <DetailsGroup label="KYC">
        <DetailRow
          label="Date of birth"
          value={format(parseISO(borrower.dateOfBirth), 'MMM d, yyyy')}
        />
        <DetailRow label="Gender" value={GENDER_LABELS[borrower.gender]} />
        <DetailRow label="ID type" value={ID_TYPE_LABELS[borrower.idType]} />
        <DetailRow label="ID number" value={borrower.idNumber} />
      </DetailsGroup>

      {hasEmergency ? (
        <DetailsGroup label="Emergency contact">
          {borrower.emergencyContactName && (
            <DetailRow label="Name" value={borrower.emergencyContactName} />
          )}
          {borrower.emergencyContactPhone && (
            <DetailRow label="Phone" value={formatPhone(borrower.emergencyContactPhone)} />
          )}
        </DetailsGroup>
      ) : (
        borrower.notes && <div />
      )}

      {borrower.notes && (
        <DetailsGroup label="Notes" variant="prose">
          <p className="text-sm font-medium leading-relaxed">{borrower.notes}</p>
        </DetailsGroup>
      )}
    </div>
  )
}

type DetailsGroupProps = {
  label: string
  children: ReactNode
  className?: string
  variant?: 'definition' | 'prose'
}

function DetailsGroup({
  label,
  children,
  className,
  variant = 'definition',
}: DetailsGroupProps) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-widest text-foreground pb-1.5 mb-2 border-b">
        {label}
      </p>
      {variant === 'prose' ? (
        <div>{children}</div>
      ) : (
        <dl className="flex flex-col gap-2 text-sm">{children}</dl>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      <dt className="col-span-2 text-muted-foreground">{label}</dt>
      <dd className="col-span-3 font-medium">{value}</dd>
    </div>
  )
}

type DeleteBorrowerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  borrowerName: string
  isPending: boolean
  onConfirm: () => void
}

function DeleteBorrowerDialog({ open, onOpenChange, borrowerName, isPending, onConfirm }: DeleteBorrowerDialogProps) {
  const [confirmName, setConfirmName] = useState('')
  const isMatch = confirmName.trim() === borrowerName.trim()

  function handleOpenChange(next: boolean) {
    if (!next) setConfirmName('')
    onOpenChange(next)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete borrower?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. Type <span className="font-semibold text-foreground">{borrowerName}</span> to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          placeholder={borrowerName}
          autoComplete="off"
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!isMatch || isPending}
            onClick={onConfirm}
          >
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
