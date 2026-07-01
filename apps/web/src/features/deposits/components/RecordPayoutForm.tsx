import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SheetClose, SheetFooter } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { formatPeso, todayManilaDateString } from '@/lib/format'
import { useRecordPayout } from '../hooks/useRecordPayout'
import { recordPayoutSchema, type RecordPayoutInput } from '../schemas'
import { PAYMENT_METHOD_LABELS } from '../utils'

interface RecordPayoutFormProps {
  depositId: string
  onSuccess: () => void
}

export function RecordPayoutForm({ depositId, onSuccess }: RecordPayoutFormProps) {
  const recordPayout = useRecordPayout(depositId)

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<RecordPayoutInput>({
    resolver: zodResolver(recordPayoutSchema) as Resolver<RecordPayoutInput>,
    defaultValues: {
      paidAt: todayManilaDateString(),
    },
  })

  const amount = useWatch({ control, name: 'amount' })
  const principalPortion = useWatch({ control, name: 'principalPortion' })
  const returnPortion = useWatch({ control, name: 'returnPortion' })
  const method = useWatch({ control, name: 'method' })

  const principal = Number(principalPortion) || 0
  const returnAmt = Number(returnPortion) || 0
  const split = principal + returnAmt
  const isSplitMismatched = Math.round(split * 100) !== Math.round((Number(amount) || 0) * 100)

  function handleRecord(values: RecordPayoutInput) {
    recordPayout.mutate(values, { onSuccess })
  }

  return (
    <form onSubmit={handleSubmit(handleRecord)} className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-6">
        <FieldGroup>
          <Field data-invalid={!!errors.amount}>
            <FieldLabel htmlFor="payoutAmount">Amount (₱)</FieldLabel>
            <NumericInput
              id="payoutAmount"
              placeholder="0.00"
              value={amount ?? undefined}
              onChange={(val) => setValue('amount', val as number, { shouldValidate: true })}
              aria-invalid={!!errors.amount}
            />
            <FieldError errors={[errors.amount]} />
          </Field>

          <Field data-invalid={!!errors.principalPortion}>
            <FieldLabel htmlFor="principalPortion">Principal Portion (₱)</FieldLabel>
            <NumericInput
              id="principalPortion"
              placeholder="0.00"
              value={principalPortion ?? undefined}
              onChange={(val) => setValue('principalPortion', val as number, { shouldValidate: true })}
              aria-invalid={!!errors.principalPortion}
            />
            <FieldError errors={[errors.principalPortion]} />
          </Field>

          <Field data-invalid={!!errors.returnPortion}>
            <FieldLabel htmlFor="returnPortion">Return Portion (₱)</FieldLabel>
            <NumericInput
              id="returnPortion"
              placeholder="0.00"
              value={returnPortion ?? undefined}
              onChange={(val) => setValue('returnPortion', val as number, { shouldValidate: true })}
              aria-invalid={!!errors.returnPortion}
            />
            <FieldError errors={[errors.returnPortion]} />
          </Field>

          <p
            className={cn(
              'text-sm tabular-nums',
              isSplitMismatched ? 'text-destructive font-medium' : 'text-muted-foreground',
            )}
          >
            Split: {formatPeso(principal)} + {formatPeso(returnAmt)} = {formatPeso(split)}
          </p>

          <Field data-invalid={!!errors.method}>
            <FieldLabel htmlFor="payoutMethod">Payment Method</FieldLabel>
            <Select
              value={method ?? ''}
              onValueChange={(val) =>
                setValue('method', val as RecordPayoutInput['method'], { shouldValidate: true })
              }
            >
              <SelectTrigger id="payoutMethod" aria-invalid={!!errors.method}>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(PAYMENT_METHOD_LABELS) as [RecordPayoutInput['method'], string][]).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[errors.method]} />
          </Field>

          <Field data-invalid={!!errors.paidAt}>
            <FieldLabel htmlFor="paidAt">Payout Date</FieldLabel>
            <Input id="paidAt" type="date" aria-invalid={!!errors.paidAt} {...register('paidAt')} />
            <FieldError errors={[errors.paidAt]} />
          </Field>

          <Field data-invalid={!!errors.notes}>
            <FieldLabel htmlFor="payoutNotes">Notes (optional)</FieldLabel>
            <Input id="payoutNotes" {...register('notes')} />
            <FieldError errors={[errors.notes]} />
          </Field>

          {recordPayout.error ? (
            <Alert variant="destructive">
              <AlertDescription>{recordPayout.error.message}</AlertDescription>
            </Alert>
          ) : null}
        </FieldGroup>
      </div>

      <SheetFooter className="shrink-0 flex-row justify-end p-6 pt-0">
        <SheetClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </SheetClose>
        <Button type="submit" disabled={recordPayout.isPending}>
          {recordPayout.isPending ? <Spinner data-icon="inline-start" /> : null}
          {recordPayout.isPending ? 'Recording…' : 'Record Payout'}
        </Button>
      </SheetFooter>
    </form>
  )
}
