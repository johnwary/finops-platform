import { useMemo } from 'react'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SheetClose, SheetFooter } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { useRecordPayment } from '../hooks/useRecordPayment'
import { recordPaymentSchema, type RecordPaymentInput } from '../schemas'
import type { LoanInstallment } from '../types'
import { formatPeso, PAYMENT_METHOD_LABELS } from '../utils'

interface RecordPaymentFormProps {
  loanId: string
  remainingBalance: string
  installments: LoanInstallment[]
  onSuccess: () => void
}

type OutstandingInstallment = {
  id: string
  sequence: number
  dueDate: string
  principal: number
  interest: number
  total: number
  isDue: boolean
}

type PaymentPreviewRow = OutstandingInstallment & {
  payment: number
}

function getInstallmentDisplayAmount(installment: OutstandingInstallment | PaymentPreviewRow) {
  return 'payment' in installment ? installment.payment : installment.total
}

function toMoney(value: number) {
  return Math.round(value * 100) / 100
}

function getOutstandingInstallments(installments: LoanInstallment[]) {
  const today = new Date()

  return installments
    .map((installment) => {
      const principalApplied = installment.allocations?.reduce(
        (sum, allocation) => sum + Number(allocation.principalApplied),
        0,
      ) ?? 0
      const interestApplied = installment.allocations?.reduce(
        (sum, allocation) => sum + Number(allocation.interestApplied),
        0,
      ) ?? 0
      const principal = toMoney(Math.max(Number(installment.principal) - principalApplied, 0))
      const interest = toMoney(Math.max(Number(installment.interest) - interestApplied, 0))
      const total = toMoney(principal + interest)

      return {
        id: installment.id,
        sequence: installment.sequence,
        dueDate: installment.dueDate,
        principal,
        interest,
        total,
        isDue: installment.status === 'OVERDUE' || new Date(installment.dueDate) <= today,
      }
    })
    .filter((installment) => installment.total > 0)
    .sort((a, b) => {
      const dueDateSort = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      return dueDateSort || a.sequence - b.sequence
    })
}

function buildPaymentPreview(amount: number, installments: OutstandingInstallment[]) {
  let remaining = amount
  const rows: PaymentPreviewRow[] = []

  for (const installment of installments) {
    if (remaining <= 0) break

    const payment = toMoney(Math.min(remaining, installment.total))
    rows.push({ ...installment, payment })
    remaining = toMoney(remaining - payment)
  }

  return rows
}

function todayInputValue() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function RecordPaymentForm({ loanId, remainingBalance, installments, onSuccess }: RecordPaymentFormProps) {
  const recordPayment = useRecordPayment()
  const outstandingInstallments = useMemo(() => getOutstandingInstallments(installments), [installments])
  const overdueAmount = outstandingInstallments
    .filter((installment) => installment.isDue)
    .reduce((sum, installment) => sum + installment.total, 0)
  const nextInstallment = outstandingInstallments[0]
  const suggestedAmount = toMoney(overdueAmount > 0 ? overdueAmount : (nextInstallment?.total ?? 0))
  const maxAmount = toMoney(outstandingInstallments.reduce((sum, installment) => sum + installment.total, 0))
  const schema = useMemo(() => recordPaymentSchema(maxAmount), [maxAmount])

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<RecordPaymentInput>({
    resolver: zodResolver(schema) as Resolver<RecordPaymentInput>,
    defaultValues: {
      amount: suggestedAmount || undefined,
      paidAt: todayInputValue(),
    },
  })

  const method = useWatch({ control, name: 'method' })
  const amount = useWatch({ control, name: 'amount' }) ?? 0
  const previewRows = useMemo(
    () => buildPaymentPreview(Number(amount) || 0, outstandingInstallments),
    [amount, outstandingInstallments],
  )

  function handleRecord(values: RecordPaymentInput) {
    recordPayment.mutate({ id: loanId, ...values }, { onSuccess })
  }

  return (
    <form onSubmit={handleSubmit(handleRecord)} className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-6">
        <FieldGroup>
          <Field data-invalid={!!errors.amount}>
            <FieldLabel htmlFor="paymentAmount">Amount (₱)</FieldLabel>
            <Input
              id="paymentAmount"
              type="number"
              min="0"
              step="0.01"
              aria-invalid={!!errors.amount}
              {...register('amount', { valueAsNumber: true })}
            />
            <div className="grid grid-cols-3 rounded-md border divide-x text-xs">
              <div className="flex flex-col gap-0.5 px-3 py-2">
                <span className="text-muted-foreground">Suggested</span>
                <span className="font-medium tabular-nums">{formatPeso(suggestedAmount)}</span>
              </div>
              <div className="flex flex-col gap-0.5 px-3 py-2">
                <span className="text-muted-foreground">Scheduled</span>
                <span className="font-medium tabular-nums">{formatPeso(maxAmount)}</span>
              </div>
              <div className="flex flex-col gap-0.5 px-3 py-2">
                <span className="text-muted-foreground">Balance</span>
                <span className="font-medium tabular-nums">{formatPeso(remainingBalance)}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedAmount > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setValue('amount', suggestedAmount, { shouldDirty: true, shouldValidate: true })}
                >
                  Use Suggested
                </Button>
              ) : null}
              {maxAmount > 0 && maxAmount !== suggestedAmount ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setValue('amount', maxAmount, { shouldDirty: true, shouldValidate: true })}
                >
                  Pay All Scheduled
                </Button>
              ) : null}
            </div>
            <FieldError errors={[errors.amount]} />
          </Field>

          {outstandingInstallments.length > 0 ? (
            <div className="rounded-md border">
              <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-b">
                <p className="text-sm font-medium">
                  {overdueAmount > 0 ? 'Catching up overdue installments' : 'Next installment due'}
                </p>
                <Badge variant={overdueAmount > 0 ? 'destructive' : 'secondary'} className="shrink-0">
                  {overdueAmount > 0 ? 'Overdue' : 'On track'}
                </Badge>
              </div>

              <div className="divide-y">
                {(previewRows.length > 0 ? previewRows : outstandingInstallments.slice(0, 1)).slice(0, 4).map((installment) => (
                  <div key={installment.id} className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium tabular-nums">
                        #{installment.sequence} · {format(new Date(installment.dueDate), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPeso(installment.principal)} principal + {formatPeso(installment.interest)} interest
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums">
                      {formatPeso(getInstallmentDisplayAmount(installment))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Alert>
              <AlertDescription>No unpaid scheduled installments for this loan.</AlertDescription>
            </Alert>
          )}

          <Field data-invalid={!!errors.method}>
            <FieldLabel htmlFor="paymentMethod">Payment Method</FieldLabel>
            <Select
              value={method}
              onValueChange={(val) =>
                setValue('method', val as RecordPaymentInput['method'], { shouldValidate: true })
              }
            >
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(PAYMENT_METHOD_LABELS) as [RecordPaymentInput['method'], string][]).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[errors.method]} />
          </Field>

          <Field data-invalid={!!errors.paidAt}>
            <FieldLabel htmlFor="paidAt">Payment Date</FieldLabel>
            <Input id="paidAt" type="date" {...register('paidAt')} />
            <FieldError errors={[errors.paidAt]} />
          </Field>

          <Field data-invalid={!!errors.reference}>
            <FieldLabel htmlFor="reference">Reference (optional)</FieldLabel>
            <Input id="reference" {...register('reference')} />
            <FieldError errors={[errors.reference]} />
          </Field>

          <Field data-invalid={!!errors.notes}>
            <FieldLabel htmlFor="paymentNotes">Notes (optional)</FieldLabel>
            <Input id="paymentNotes" {...register('notes')} />
            <FieldError errors={[errors.notes]} />
          </Field>

          {recordPayment.error ? (
            <Alert variant="destructive">
              <AlertDescription>{recordPayment.error.message}</AlertDescription>
            </Alert>
          ) : null}
        </FieldGroup>
      </div>

      <SheetFooter className="shrink-0 flex-row justify-end p-6 pt-0">
        <SheetClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </SheetClose>
        <Button type="submit" disabled={recordPayment.isPending}>
          {recordPayment.isPending ? <Spinner data-icon="inline-start" /> : null}
          {recordPayment.isPending ? 'Recording…' : 'Record Payment'}
        </Button>
      </SheetFooter>
    </form>
  )
}
