import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { formatPeso, PAYMENT_METHOD_LABELS } from '../utils'

interface RecordPaymentFormProps {
  loanId: string
  remainingBalance: string
  onSuccess: () => void
}

export function RecordPaymentForm({ loanId, remainingBalance, onSuccess }: RecordPaymentFormProps) {
  const recordPayment = useRecordPayment()

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<RecordPaymentInput>({
    resolver: zodResolver(recordPaymentSchema) as Resolver<RecordPaymentInput>,
    defaultValues: {
      principalPortion: 0,
      interestPortion: 0,
      investmentReturn: 0,
      insurance: 0,
      penalties: 0,
    },
  })

  const method = useWatch({ control, name: 'method' })

  function handleRecord(values: RecordPaymentInput) {
    recordPayment.mutate({ id: loanId, ...values }, { onSuccess })
  }

  return (
    <form onSubmit={handleSubmit(handleRecord)} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6">
        <FieldGroup>
          <Field data-invalid={!!errors.amount}>
            <FieldLabel htmlFor="paymentAmount">Amount (₱)</FieldLabel>
            <Input id="paymentAmount" type="number" min="0" step="0.01" {...register('amount', { valueAsNumber: true })} />
            <p className="text-xs text-muted-foreground">Remaining: {formatPeso(remainingBalance)}</p>
            <FieldError errors={[errors.amount]} />
          </Field>

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
            <FieldLabel htmlFor="paidAt">Payment Date (optional)</FieldLabel>
            <Input id="paidAt" type="date" {...register('paidAt')} />
            <FieldError errors={[errors.paidAt]} />
          </Field>

          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Breakdown (optional)</p>

          <Field data-invalid={!!errors.principalPortion}>
            <FieldLabel htmlFor="principalPortion">Principal (₱)</FieldLabel>
            <Input id="principalPortion" type="number" min="0" step="0.01" {...register('principalPortion', { valueAsNumber: true })} />
            <FieldError errors={[errors.principalPortion]} />
          </Field>

          <Field data-invalid={!!errors.interestPortion}>
            <FieldLabel htmlFor="interestPortion">Interest (₱)</FieldLabel>
            <Input id="interestPortion" type="number" min="0" step="0.01" {...register('interestPortion', { valueAsNumber: true })} />
            <FieldError errors={[errors.interestPortion]} />
          </Field>

          <Field data-invalid={!!errors.investmentReturn}>
            <FieldLabel htmlFor="investmentReturn">Investment Return (₱)</FieldLabel>
            <Input id="investmentReturn" type="number" min="0" step="0.01" {...register('investmentReturn', { valueAsNumber: true })} />
            <FieldError errors={[errors.investmentReturn]} />
          </Field>

          <Field data-invalid={!!errors.insurance}>
            <FieldLabel htmlFor="insurance">Insurance (₱)</FieldLabel>
            <Input id="insurance" type="number" min="0" step="0.01" {...register('insurance', { valueAsNumber: true })} />
            <FieldError errors={[errors.insurance]} />
          </Field>

          <Field data-invalid={!!errors.penalties}>
            <FieldLabel htmlFor="penalties">Penalties (₱)</FieldLabel>
            <Input id="penalties" type="number" min="0" step="0.01" {...register('penalties', { valueAsNumber: true })} />
            <FieldError errors={[errors.penalties]} />
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

      <SheetFooter className="p-6 pt-0">
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
