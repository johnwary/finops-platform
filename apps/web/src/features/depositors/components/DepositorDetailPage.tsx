import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { DepositorDepositsList } from '../components/DepositorDepositsList'
import { EditDepositorForm } from '../components/EditDepositorForm'
import { useDepositor } from '../hooks/useDepositor'
import { useDeleteDepositor } from '../hooks/useDeleteDepositor'
import type { DepositorDetail } from '../types'
import { ID_TYPE_LABELS } from '../utils'

export function DepositorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const depositor = useDepositor(id)

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const deleteDepositor = useDeleteDepositor()

  if (depositor.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (depositor.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {depositor.error.message ?? 'Failed to load depositor.'}
        </AlertDescription>
      </Alert>
    )
  }

  const data = depositor.data
  if (!data) return null

  const hasDeposits = data.deposits.length > 0
  const activeDepositCount = data.deposits.filter((deposit) => deposit.status === 'ACTIVE').length
  const totalDeposited = data.deposits.reduce((sum, deposit) => sum + Number(deposit.amount), 0)

  function handleDelete() {
    deleteDepositor.mutate(data.id, {
      onSuccess: () => {
        setIsDeleteOpen(false)
        navigate('/dashboard/depositors')
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Depositor
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
              <div className="flex flex-col items-end gap-0.5">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setIsDeleteOpen(true)}
                  disabled={deleteDepositor.isPending || hasDeposits}
                >
                  {deleteDepositor.isPending ? <Spinner data-icon="inline-start" /> : null}
                  Delete
                </Button>
                {hasDeposits && (
                  <p className="text-xs text-muted-foreground">Has existing deposits</p>
                )}
              </div>
            </RequireRole>
          </div>
        </RequireRole>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DepositorStatCard label="Total deposits" value={String(data.deposits.length)} />
        <DepositorStatCard label="Active deposits" value={String(activeDepositCount)} />
        <DepositorStatCard label="Total deposited" value={formatPeso(totalDeposited)} />
      </div>

      {/* Details */}
      <DepositorDetailsGrid depositor={data} />

      {/* Deposits */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground pb-1.5 mb-3 border-b">
          Deposits ({data.deposits.length})
        </h2>
        <DepositorDepositsList deposits={data.deposits} />
      </div>

      {/* Delete confirmation */}
      <DeleteDepositorDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        depositorName={data.name}
        isPending={deleteDepositor.isPending}
        onConfirm={handleDelete}
      />

      {/* Edit sheet */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent className="sm:max-w-lg flex flex-col p-0">
          <SheetHeader className="p-6 pb-0">
            <SheetTitle>Edit Depositor</SheetTitle>
            <SheetDescription>Update depositor profile.</SheetDescription>
          </SheetHeader>
          <EditDepositorForm depositor={data} onSuccess={() => setIsEditOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}

function DepositorStatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function DepositorDetailsGrid({ depositor }: { depositor: DepositorDetail }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:gap-x-6">
      <DetailsGroup label="Identity">
        <DetailRow label="Email" value={depositor.email} />
        <DetailRow label="Phone" value={depositor.phone} />
        <DetailRow label="Address" value={depositor.address} />
      </DetailsGroup>

      <DetailsGroup label="KYC">
        {depositor.dateOfBirth && (
          <DetailRow
            label="Date of birth"
            value={format(parseISO(depositor.dateOfBirth), 'MMM d, yyyy')}
          />
        )}
        {depositor.idType && (
          <DetailRow label="ID type" value={ID_TYPE_LABELS[depositor.idType]} />
        )}
        {depositor.idNumber && <DetailRow label="ID number" value={depositor.idNumber} />}
      </DetailsGroup>

      {depositor.notes && (
        <DetailsGroup label="Notes" variant="prose">
          <p className="text-sm font-medium leading-relaxed">{depositor.notes}</p>
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

type DeleteDepositorDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  depositorName: string
  isPending: boolean
  onConfirm: () => void
}

function DeleteDepositorDialog({ open, onOpenChange, depositorName, isPending, onConfirm }: DeleteDepositorDialogProps) {
  const [confirmName, setConfirmName] = useState('')
  const isMatch = confirmName.trim() === depositorName.trim()

  function handleOpenChange(next: boolean) {
    if (!next) setConfirmName('')
    onOpenChange(next)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete depositor?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. Type <span className="font-semibold text-foreground">{depositorName}</span> to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          placeholder={depositorName}
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
