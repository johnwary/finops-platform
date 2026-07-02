import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RequireRole } from '@/features/auth/components/RequireRole'
import { formatBorrowerName } from '@/features/borrowers/utils'
import { formatPeso, formatPercent } from '@/lib/format'
import { ApproveForm } from '../components/ApproveForm'
import { CancelForm } from '../components/CancelForm'
import { DisburseForm } from '../components/DisburseForm'
import { LoanStatusBadge } from '../components/LoanStatusBadge'
import { RecordPaymentForm } from '../components/RecordPaymentForm'
import { WriteOffForm } from '../components/WriteOffForm'
import { RestructureForm } from '../components/RestructureForm'
import { ReasonDialog } from '@/components/reason-dialog'
import { useDefaultLoan } from '../hooks/useDefaultLoan'
import { useDeleteLoan } from '../hooks/useDeleteLoan'
import { useLoan } from '../hooks/useLoan'
import { useLockLoan, useUnlockLoan } from '../hooks/useLockLoan'
import { useMarkArrears } from '../hooks/useMarkArrears'
import { useMarkCurrent } from '../hooks/useMarkCurrent'
import { useReversePayment } from '../hooks/useReversePayment'
import type { LoanDetail } from '../types'
import {
  INSTALLMENT_STATUS_LABELS,
  LOAN_TYPE_LABELS,
  PAYMENT_FREQUENCY_LABELS,
  PAYMENT_METHOD_LABELS,
  REPAYMENT_STRUCTURE_LABELS,
} from '../utils'

const INSTALLMENT_STATUS_VARIANTS = {
  SCHEDULED: 'outline',
  PAID: 'default',
  OVERDUE: 'destructive',
} as const

export function LoanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const loan = useLoan(id!)

  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [isDisburseOpen, setIsDisburseOpen] = useState(false)
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isDefaultOpen, setIsDefaultOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isWriteOffOpen, setIsWriteOffOpen] = useState(false)
  const [isMarkArrearsOpen, setIsMarkArrearsOpen] = useState(false)
  const [isMarkCurrentOpen, setIsMarkCurrentOpen] = useState(false)
  const [isRestructureOpen, setIsRestructureOpen] = useState(false)
  const [isLockOpen, setIsLockOpen] = useState(false)

  const defaultLoan = useDefaultLoan()
  const deleteLoan = useDeleteLoan()
  const markArrears = useMarkArrears()
  const markCurrent = useMarkCurrent()
  const lockLoan = useLockLoan()
  const unlockLoan = useUnlockLoan()

  if (loan.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (loan.isError) {
    return (
      <div>
        <Alert variant="destructive">
          <AlertDescription>
            {loan.error.message ?? 'Failed to load loan.'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const data = loan.data
  if (!data) return null

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {LOAN_TYPE_LABELS[data.type]} Loan
          </p>
          <h1 className="text-2xl font-semibold">{formatBorrowerName(data.borrower)}</h1>
          <div className="flex items-center gap-2">
            <LoanStatusBadge status={data.status} />
            {data.locked && <Badge variant="destructive">Locked</Badge>}
          </div>
        </div>

        <RequireRole role={['admin', 'manager']} fallback="hide">
          <div className="flex items-center gap-2 flex-wrap">
            {data.status === 'PENDING' && (
              <>
                <Button size="sm" onClick={() => setIsApproveOpen(true)}>
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsCancelOpen(true)}>Cancel</Button>
              </>
            )}
            {data.status === 'APPROVED' && (
              <>
                <Button size="sm" onClick={() => setIsDisburseOpen(true)}>Disburse</Button>
                <Button size="sm" variant="outline" onClick={() => setIsCancelOpen(true)}>Cancel</Button>
              </>
            )}
            {data.status === 'ACTIVE' && (
              <>
                <Button size="sm" onClick={() => setIsPaymentOpen(true)}>Record Payment</Button>
                <Button size="sm" variant="outline" onClick={() => setIsRestructureOpen(true)}>
                  Restructure
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsMarkArrearsOpen(true)}>
                  Mark In Arrears
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsDefaultOpen(true)}>
                  Mark Default
                </Button>
              </>
            )}
            {data.status === 'IN_ARREARS' && (
              <>
                <Button size="sm" onClick={() => setIsPaymentOpen(true)}>Record Payment</Button>
                <Button size="sm" variant="outline" onClick={() => setIsRestructureOpen(true)}>
                  Restructure
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsMarkCurrentOpen(true)}>
                  Mark Current
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsDefaultOpen(true)}>
                  Mark Default
                </Button>
              </>
            )}
            {data.status === 'DEFAULTED' && (
              <>
                <Button size="sm" variant="outline" onClick={() => setIsRestructureOpen(true)}>
                  Restructure
                </Button>
                <RequireRole role="admin" fallback="hide">
                  <Button size="sm" variant="destructive" onClick={() => setIsWriteOffOpen(true)}>
                    Write Off
                  </Button>
                </RequireRole>
              </>
            )}
            <RequireRole role="admin" fallback="hide">
              {(data.status === 'ACTIVE' || data.status === 'IN_ARREARS') &&
                (data.locked ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={unlockLoan.isPending}
                    onClick={() => unlockLoan.mutate({ id: data.id })}
                  >
                    Unlock
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setIsLockOpen(true)}>
                    Lock
                  </Button>
                ))}
              {(data.status === 'PENDING' || data.status === 'APPROVED') && (
                <Button size="sm" variant="destructive" onClick={() => setIsDeleteOpen(true)}>
                  Delete
                </Button>
              )}
            </RequireRole>
          </div>
        </RequireRole>
      </div>

      {/* Financial snapshot */}
      <FinancialSnapshot loan={data} />

      {/* Details + tables */}
      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <LoanDetailsCard loan={data} />

        <Tabs defaultValue="installments">
          <TabsList>
            <TabsTrigger value="installments">
              Installments
              {data.loanInstallments.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {data.loanInstallments.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="payments">
              Payments
              {data.loanPayments.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {data.loanPayments.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="installments" className="mt-4">
            <InstallmentTable loan={data} />
          </TabsContent>
          <TabsContent value="payments" className="mt-4">
            <PaymentTable loan={data} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Sheets */}
      <Sheet open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <SheetContent className="flex flex-col p-0">
          <SheetHeader className="p-6 pb-0">
            <SheetTitle>Approve Loan</SheetTitle>
            <SheetDescription>Set the approval date for this loan.</SheetDescription>
          </SheetHeader>
          <ApproveForm loanId={data.id} onSuccess={() => setIsApproveOpen(false)} />
        </SheetContent>
      </Sheet>

      <Sheet open={isDisburseOpen} onOpenChange={setIsDisburseOpen}>
        <SheetContent className="flex flex-col p-0">
          <SheetHeader className="p-6 pb-0">
            <SheetTitle>Disburse Loan</SheetTitle>
            <SheetDescription>Select disbursement method to activate this loan.</SheetDescription>
          </SheetHeader>
          <DisburseForm loanId={data.id} loanFee={data.loanFee} onSuccess={() => setIsDisburseOpen(false)} />
        </SheetContent>
      </Sheet>

      <Sheet open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <SheetContent className="flex flex-col p-0">
          <SheetHeader className="p-6 pb-0">
            <SheetTitle>Cancel Loan</SheetTitle>
            <SheetDescription>Provide a reason for canceling this loan.</SheetDescription>
          </SheetHeader>
          <CancelForm loanId={data.id} onSuccess={() => setIsCancelOpen(false)} />
        </SheetContent>
      </Sheet>

      <Sheet open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <SheetContent className="sm:max-w-lg flex flex-col p-0">
          <SheetHeader className="p-6 pb-0">
            <SheetTitle>Record Payment</SheetTitle>
            <SheetDescription>Record a payment against this loan.</SheetDescription>
          </SheetHeader>
          <RecordPaymentForm
            loanId={data.id}
            remainingBalance={data.remainingBalance}
            installments={data.loanInstallments}
            onSuccess={() => setIsPaymentOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={isWriteOffOpen} onOpenChange={setIsWriteOffOpen}>
        <SheetContent className="flex flex-col p-0">
          <SheetHeader className="p-6 pb-0">
            <SheetTitle>Write Off Loan</SheetTitle>
            <SheetDescription>Provide a reason for writing off this defaulted loan.</SheetDescription>
          </SheetHeader>
          <WriteOffForm loanId={data.id} onSuccess={() => setIsWriteOffOpen(false)} />
        </SheetContent>
      </Sheet>

      <Sheet open={isRestructureOpen} onOpenChange={setIsRestructureOpen}>
        <SheetContent className="sm:max-w-lg flex flex-col p-0">
          <SheetHeader className="p-6 pb-0">
            <SheetTitle>Restructure Loan</SheetTitle>
            <SheetDescription>Rebuild the repayment schedule from the current remaining balance under new terms.</SheetDescription>
          </SheetHeader>
          <RestructureForm loan={data} onSuccess={() => setIsRestructureOpen(false)} />
        </SheetContent>
      </Sheet>

      <ConfirmLoanActionDialog
        open={isMarkArrearsOpen}
        onOpenChange={setIsMarkArrearsOpen}
        title="Mark loan as in arrears?"
        description="This will set the loan status to IN_ARREARS. The borrower will appear on the collections worklist."
        confirmLabel="Mark In Arrears"
        borrowerName={formatBorrowerName(data.borrower)}
        isPending={markArrears.isPending}
        onConfirm={() => markArrears.mutate({ id: data.id }, { onSuccess: () => setIsMarkArrearsOpen(false) })}
      />

      <ConfirmLoanActionDialog
        open={isMarkCurrentOpen}
        onOpenChange={setIsMarkCurrentOpen}
        title="Mark loan as current?"
        description="This will restore the loan status to ACTIVE."
        confirmLabel="Mark Current"
        borrowerName={formatBorrowerName(data.borrower)}
        isPending={markCurrent.isPending}
        onConfirm={() => markCurrent.mutate({ id: data.id }, { onSuccess: () => setIsMarkCurrentOpen(false) })}
      />

      <ConfirmLoanActionDialog
        open={isDefaultOpen}
        onOpenChange={setIsDefaultOpen}
        title="Mark loan as defaulted?"
        description="This will set the loan status to DEFAULTED and record a provision event. This cannot be undone."
        confirmLabel="Mark Default"
        borrowerName={formatBorrowerName(data.borrower)}
        isPending={defaultLoan.isPending}
        onConfirm={() => defaultLoan.mutate({ id: data.id }, { onSuccess: () => setIsDefaultOpen(false) })}
      />

      <ReasonDialog
        open={isLockOpen}
        onOpenChange={setIsLockOpen}
        title="Lock loan?"
        description="Payments will be rejected until the loan is unlocked. Use for disputes, fraud review, or legal holds."
        confirmLabel="Lock"
        isPending={lockLoan.isPending}
        onConfirm={(reason) =>
          lockLoan.mutate({ id: data.id, reason }, { onSuccess: () => setIsLockOpen(false) })
        }
      />

      <ConfirmLoanActionDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete loan?"
        description="This will permanently remove the loan record. This cannot be undone."
        confirmLabel="Delete"
        confirmVariant="destructive"
        borrowerName={formatBorrowerName(data.borrower)}
        isPending={deleteLoan.isPending}
        onConfirm={() => deleteLoan.mutate(data.id, { onSuccess: () => setIsDeleteOpen(false) })}
      />
    </div>
  )
}

type ConfirmLoanActionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  confirmVariant?: 'destructive' | 'default'
  borrowerName: string
  isPending: boolean
  onConfirm: () => void
}

function ConfirmLoanActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmVariant = 'default',
  borrowerName,
  isPending,
  onConfirm,
}: ConfirmLoanActionDialogProps) {
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
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description} Type <span className="font-semibold text-foreground">{borrowerName}</span> to confirm.
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
            variant={confirmVariant}
            disabled={!isMatch || isPending}
            onClick={onConfirm}
          >
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function FinancialSnapshot({ loan }: { loan: LoanDetail }) {
  const amount = Number(loan.amount)
  const principalRepaid = amount - Number(loan.remainingBalance)
  const progressPct = amount > 0 ? Math.min((principalRepaid / amount) * 100, 100) : 0

  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-10">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5">Remaining Balance</p>
            <p className="text-3xl font-semibold tabular-nums">{formatPeso(loan.remainingBalance)}</p>
          </div>
          <div className="flex gap-8 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Total Paid</p>
              <p className="font-medium tabular-nums">{formatPeso(loan.totalPaid)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Original Amount</p>
              <p className="font-medium tabular-nums">{formatPeso(loan.amount)}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{progressPct.toFixed(0)}% collected</p>
      </CardContent>
    </Card>
  )
}

function LoanDetailsCard({ loan }: { loan: LoanDetail }) {
  return (
    <div className="flex flex-col gap-5">
      <DetailsGroup label="Borrower">
        <DetailRow label="Name" value={formatBorrowerName(loan.borrower)} />
        <DetailRow label="Email" value={loan.borrower.email} />
        <DetailRow label="Phone" value={loan.borrower.phone} />
      </DetailsGroup>

      <DetailsGroup label="Loan Terms">
        <DetailRow label="Amount" value={formatPeso(loan.amount)} />
        <DetailRow label="Interest Rate" value={formatPercent(loan.interestRate)} />
        <DetailRow label="Term" value={`${loan.termMonths} months`} />
        <DetailRow label="Frequency" value={PAYMENT_FREQUENCY_LABELS[loan.paymentFrequency]} />
        <DetailRow label="Structure" value={REPAYMENT_STRUCTURE_LABELS[loan.repaymentStructure]} />
        {loan.loanFee && <DetailRow label="Loan Fee" value={formatPeso(loan.loanFee)} />}
        {loan.penaltyRate && <DetailRow label="Penalty Rate" value={formatPercent(loan.penaltyRate)} />}
        {loan.disbursementMethod && (
          <DetailRow label="Disbursement Method" value={PAYMENT_METHOD_LABELS[loan.disbursementMethod]} />
        )}
      </DetailsGroup>

      <DetailsGroup label="Timeline">
        <DetailRow label="Application Date" value={format(new Date(loan.applicationDate), 'MMM d, yyyy')} />
        {loan.approvedAt && <DetailRow label="Approved Date" value={format(new Date(loan.approvedAt), 'MMM d, yyyy')} />}
        {loan.disbursedAt && <DetailRow label="Disbursed Date" value={format(new Date(loan.disbursedAt), 'MMM d, yyyy')} />}
        {loan.endDate && <DetailRow label="End Date" value={format(new Date(loan.endDate), 'MMM d, yyyy')} />}
        {loan.paidAt && <DetailRow label="Paid Date" value={format(new Date(loan.paidAt), 'MMM d, yyyy')} />}
        {loan.canceledAt && <DetailRow label="Canceled Date" value={format(new Date(loan.canceledAt), 'MMM d, yyyy')} />}
        {loan.defaultedAt && <DetailRow label="Defaulted Date" value={format(new Date(loan.defaultedAt), 'MMM d, yyyy')} />}
        <DetailRow label="Date Created" value={format(new Date(loan.createdAt), 'MMM d, yyyy')} />
      </DetailsGroup>

      {(loan.purpose || loan.notes || loan.cancellationReason) && (
        <DetailsGroup label="Notes">
          {loan.purpose && <StackedRow label="Purpose" value={loan.purpose} />}
          {loan.notes && <StackedRow label="Notes" value={loan.notes} />}
          {loan.cancellationReason && (
            <StackedRow label="Cancellation Reason" value={loan.cancellationReason} />
          )}
        </DetailsGroup>
      )}
    </div>
  )
}

function DetailsGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-foreground pb-1.5 mb-2 border-b">{label}</p>
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

function resolveInstallmentStatus(inst: LoanDetail['loanInstallments'][number]): 'SCHEDULED' | 'PAID' | 'OVERDUE' {
  if (inst.status === 'PAID') return 'PAID'
  if (inst.status === 'OVERDUE' || new Date(inst.dueDate) <= new Date()) return 'OVERDUE'
  return 'SCHEDULED'
}

function InstallmentTable({ loan }: { loan: LoanDetail }) {
  if (!loan.loanInstallments.length) {
    return <p className="text-sm text-muted-foreground">Installments generated upon disbursement.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Principal</TableHead>
          <TableHead>Interest</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loan.loanInstallments.map((inst) => {
          const status = resolveInstallmentStatus(inst)
          return (
            <TableRow key={inst.id} data-overdue={status === 'OVERDUE' ? true : undefined} className="data-[overdue]:bg-destructive/5">
              <TableCell>{inst.sequence}</TableCell>
              <TableCell className={status === 'OVERDUE' ? 'text-destructive font-medium' : ''}>
                {format(new Date(inst.dueDate), 'MMM d, yyyy')}
              </TableCell>
              <TableCell className="tabular-nums">{formatPeso(inst.principal)}</TableCell>
              <TableCell className="tabular-nums">{formatPeso(inst.interest)}</TableCell>
              <TableCell className="tabular-nums">
                {formatPeso(Number(inst.principal) + Number(inst.interest))}
              </TableCell>
              <TableCell>
                <Badge variant={INSTALLMENT_STATUS_VARIANTS[status]}>
                  {INSTALLMENT_STATUS_LABELS[status]}
                </Badge>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function printReceipt(payment: LoanDetail['loanPayments'][number], loan: LoanDetail) {
  const w = window.open('', '_blank', 'width=600,height=700')
  if (!w) return
  const borrowerName = formatBorrowerName(loan.borrower)
  const hasPenalties = Number(payment.penalties) > 0

  const d = w.document
  d.write('<!DOCTYPE html><html><head></head><body></body></html>')
  d.close()

  const title = d.createElement('title')
  title.textContent = `Receipt ${payment.receiptNumber}`
  d.head.appendChild(title)

  const style = d.createElement('style')
  style.textContent = `
    body { font-family: sans-serif; font-size: 13px; padding: 32px; max-width: 480px; margin: 0 auto; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    .sub { color: #666; font-size: 12px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 6px 0; }
    td:last-child { text-align: right; font-weight: 600; }
    .divider { border-top: 1px solid #ddd; margin: 12px 0; }
    .total td { font-size: 15px; font-weight: 700; }
    @media print { button { display: none; } }
  `
  d.head.appendChild(style)

  function text(tag: string, content: string, className?: string) {
    const el = d.createElement(tag)
    el.textContent = content
    if (className) el.className = className
    return el
  }
  function row(label: string, value: string) {
    const tr = d.createElement('tr')
    const td1 = d.createElement('td'); td1.textContent = label
    const td2 = d.createElement('td'); td2.textContent = value
    tr.append(td1, td2)
    return tr
  }
  function divider() {
    const div = d.createElement('div'); div.className = 'divider'; return div
  }
  function table(...rows: HTMLTableRowElement[]) {
    const t = d.createElement('table'); t.append(...rows); return t
  }

  d.body.append(
    text('h1', 'Payment Receipt'),
    text('p', payment.receiptNumber, 'sub'),
    table(
      row('Borrower', borrowerName),
      row('Date Paid', format(new Date(payment.paidAt), 'MMMM d, yyyy')),
      row('Method', PAYMENT_METHOD_LABELS[payment.method]),
      ...(payment.reference ? [row('Reference', payment.reference)] : []),
    ),
    divider(),
    table(
      row('Principal Repaid', formatPeso(payment.principalPortion)),
      row('Interest', formatPeso(payment.interestPortion)),
      ...(hasPenalties ? [row('Penalties', formatPeso(payment.penalties))] : []),
    ),
    divider(),
    Object.assign(table(row('Total Paid', formatPeso(payment.amount))), { className: 'total' }),
    divider(),
    Object.assign(text('p', 'Remaining loan balance after this payment is not shown on this receipt. Keep this receipt for your records.'), { style: 'color:#666;font-size:11px;margin-top:24px;' }),
    Object.assign(d.createElement('button'), { textContent: 'Print', onclick: () => w.print() }),
  )
}

function PaymentTable({ loan }: { loan: LoanDetail }) {
  const reversePayment = useReversePayment(loan.id)
  const [reverseTargetId, setReverseTargetId] = useState<string | null>(null)

  if (!loan.loanPayments.length) {
    return <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
  }

  const hasPenalties = loan.loanPayments.some((p) => Number(p.penalties) > 0)
  // Reversal is LIFO-only (matches API): only the newest non-reversed payment,
  // and only while the loan is in a reversible state.
  const canReverse = ['ACTIVE', 'IN_ARREARS', 'PAID'].includes(loan.status)
  const latestReversibleId = canReverse
    ? loan.loanPayments.find((p) => !p.reversedAt)?.id
    : undefined

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date Paid</TableHead>
            <TableHead>Receipt</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Principal</TableHead>
            <TableHead>Interest</TableHead>
            {hasPenalties && <TableHead>Penalties</TableHead>}
            <TableHead>Method</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loan.loanPayments.map((payment) => (
            <TableRow key={payment.id} className={payment.reversedAt ? 'opacity-60' : ''}>
              <TableCell>{format(new Date(payment.paidAt), 'MMM d, yyyy')}</TableCell>
              <TableCell className="font-medium tabular-nums">{payment.receiptNumber}</TableCell>
              <TableCell className="tabular-nums">{formatPeso(payment.amount)}</TableCell>
              <TableCell className="tabular-nums">{formatPeso(payment.principalPortion)}</TableCell>
              <TableCell className="tabular-nums">{formatPeso(payment.interestPortion)}</TableCell>
              {hasPenalties && (
                <TableCell className="tabular-nums">{formatPeso(payment.penalties)}</TableCell>
              )}
              <TableCell>{PAYMENT_METHOD_LABELS[payment.method]}</TableCell>
              <TableCell className="text-muted-foreground">{payment.reference ?? '—'}</TableCell>
              <TableCell>
                {payment.reversedAt ? (
                  <Badge variant="outline" title={payment.reversalReason ?? undefined}>
                    Reversed
                  </Badge>
                ) : (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => printReceipt(payment, loan)}>
                      Print
                    </Button>
                    {payment.id === latestReversibleId && (
                      <RequireRole role="admin" fallback="hide">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setReverseTargetId(payment.id)}
                        >
                          Reverse
                        </Button>
                      </RequireRole>
                    )}
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ReasonDialog
        open={reverseTargetId !== null}
        onOpenChange={(open) => !open && setReverseTargetId(null)}
        title="Reverse this payment?"
        description="This unwinds the payment from the loan balance, reopens affected installments, and removes it from the capital ledger. The record stays visible as reversed."
        confirmLabel="Reverse Payment"
        isPending={reversePayment.isPending}
        onConfirm={(reason) =>
          reversePayment.mutate(
            { paymentId: reverseTargetId!, reason },
            { onSuccess: () => setReverseTargetId(null) },
          )
        }
      />
    </>
  )
}
