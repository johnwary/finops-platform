import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { CancelForm } from './components/CancelForm'
import { DisburseForm } from './components/DisburseForm'
import { LoanStatusBadge } from './components/LoanStatusBadge'
import { RecordPaymentForm } from './components/RecordPaymentForm'
import { useApproveLoan } from './hooks/useApproveLoan'
import { useDefaultLoan } from './hooks/useDefaultLoan'
import { useDeleteLoan } from './hooks/useDeleteLoan'
import { useLoan } from './hooks/useLoan'
import type { LoanDetail } from './types'
import {
  formatPeso,
  formatPercent,
  INSTALLMENT_STATUS_LABELS,
  LOAN_TYPE_LABELS,
  PAYMENT_FREQUENCY_LABELS,
  PAYMENT_METHOD_LABELS,
  REPAYMENT_STRUCTURE_LABELS,
} from './utils'

const INSTALLMENT_STATUS_VARIANTS = {
  SCHEDULED: 'outline',
  PAID: 'default',
  OVERDUE: 'destructive',
} as const

export function LoanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const loan = useLoan(id!)

  const [isDisburseOpen, setIsDisburseOpen] = useState(false)
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)

  const approveLoan = useApproveLoan()
  const defaultLoan = useDefaultLoan()
  const deleteLoan = useDeleteLoan()

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

  const data = loan.data!

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {LOAN_TYPE_LABELS[data.type]} Loan
          </p>
          <h1 className="text-2xl font-semibold">{formatBorrowerName(data.borrower)}</h1>
          <LoanStatusBadge status={data.status} />
        </div>

        <RequireRole role={['admin', 'manager']} fallback="hide">
          <div className="flex items-center gap-2 flex-wrap">
            {data.status === 'PENDING' && (
              <>
                <Button size="sm" onClick={() => approveLoan.mutate(data.id)} disabled={approveLoan.isPending}>
                  {approveLoan.isPending ? <Spinner data-icon="inline-start" /> : null}
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
                <Button size="sm" variant="outline" onClick={() => defaultLoan.mutate(data.id)} disabled={defaultLoan.isPending}>
                  {defaultLoan.isPending ? <Spinner data-icon="inline-start" /> : null}
                  Mark Default
                </Button>
              </>
            )}
            <RequireRole role="admin" fallback="hide">
              {(data.status === 'PENDING' || data.status === 'APPROVED') && (
                <Button size="sm" variant="destructive" onClick={() => deleteLoan.mutate(data.id)} disabled={deleteLoan.isPending}>
                  {deleteLoan.isPending ? <Spinner data-icon="inline-start" /> : null}
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
      <Sheet open={isDisburseOpen} onOpenChange={setIsDisburseOpen}>
        <SheetContent className="flex flex-col p-0">
          <SheetHeader className="p-6 pb-0">
            <SheetTitle>Disburse Loan</SheetTitle>
            <SheetDescription>Select disbursement method to activate this loan.</SheetDescription>
          </SheetHeader>
          <DisburseForm loanId={data.id} onSuccess={() => setIsDisburseOpen(false)} />
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
            onSuccess={() => setIsPaymentOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
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

      <DetailsGroup label="Terms">
        <DetailRow label="Amount" value={formatPeso(loan.amount)} />
        <DetailRow label="Interest Rate" value={formatPercent(loan.interestRate)} />
        <DetailRow label="Term" value={`${loan.termMonths} months`} />
        <DetailRow label="Frequency" value={PAYMENT_FREQUENCY_LABELS[loan.paymentFrequency]} />
        <DetailRow label="Structure" value={REPAYMENT_STRUCTURE_LABELS[loan.repaymentStructure]} />
        <DetailRow label="Application Date" value={format(new Date(loan.applicationDate), 'MMM d, yyyy')} />
        <DetailRow label="End Date" value={format(new Date(loan.endDate), 'MMM d, yyyy')} />
        {loan.loanFee && <DetailRow label="Loan Fee" value={formatPeso(loan.loanFee)} />}
        {loan.penaltyRate && <DetailRow label="Penalty Rate" value={formatPercent(loan.penaltyRate)} />}
        {loan.disbursementMethod && (
          <DetailRow label="Disbursement" value={PAYMENT_METHOD_LABELS[loan.disbursementMethod]} />
        )}
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
        {loan.loanInstallments.map((inst) => (
          <TableRow key={inst.id} data-overdue={inst.status === 'OVERDUE' ? true : undefined} className="data-[overdue]:bg-destructive/5">
            <TableCell>{inst.sequence}</TableCell>
            <TableCell className={inst.status === 'OVERDUE' ? 'text-destructive font-medium' : ''}>
              {format(new Date(inst.dueDate), 'MMM d, yyyy')}
            </TableCell>
            <TableCell className="tabular-nums">{formatPeso(inst.principal)}</TableCell>
            <TableCell className="tabular-nums">{formatPeso(inst.interest)}</TableCell>
            <TableCell className="tabular-nums">
              {formatPeso(Number(inst.principal) + Number(inst.interest))}
            </TableCell>
            <TableCell>
              <Badge variant={INSTALLMENT_STATUS_VARIANTS[inst.status]}>
                {INSTALLMENT_STATUS_LABELS[inst.status]}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function PaymentTable({ loan }: { loan: LoanDetail }) {
  if (!loan.loanPayments.length) {
    return <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
  }

  const hasPenalties = loan.loanPayments.some((p) => Number(p.penalties) > 0)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date Paid</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Principal</TableHead>
          <TableHead>Interest</TableHead>
          {hasPenalties && <TableHead>Penalties</TableHead>}
          <TableHead>Method</TableHead>
          <TableHead>Reference</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loan.loanPayments.map((payment) => (
          <TableRow key={payment.id}>
            <TableCell>{format(new Date(payment.paidAt), 'MMM d, yyyy')}</TableCell>
            <TableCell className="tabular-nums">{formatPeso(payment.amount)}</TableCell>
            <TableCell className="tabular-nums">{formatPeso(payment.principalPortion)}</TableCell>
            <TableCell className="tabular-nums">{formatPeso(payment.interestPortion)}</TableCell>
            {hasPenalties && (
              <TableCell className="tabular-nums">{formatPeso(payment.penalties)}</TableCell>
            )}
            <TableCell>{PAYMENT_METHOD_LABELS[payment.method]}</TableCell>
            <TableCell className="text-muted-foreground">{payment.reference ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
