import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatPeso, todayManilaDateString } from '@/lib/format'
import { useDisburseLoan } from '../hooks/useDisburseLoan'
import { disburseLoanSchema, type DisburseLoanInput } from '../schemas'
import { PAYMENT_METHOD_LABELS } from '../utils'
import { LoanActionFormShell } from './LoanActionFormShell'

interface DisburseFormProps {
  loanId: string
  loanFee: string | null
  onSuccess: () => void
}

export function DisburseForm({ loanId, loanFee, onSuccess }: DisburseFormProps) {
  const disburseLoan = useDisburseLoan()

  const todayLocal = todayManilaDateString()
  const hasFee = loanFee !== null && Number(loanFee) > 0

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<DisburseLoanInput>({
    resolver: zodResolver(disburseLoanSchema),
    defaultValues: { disbursedAt: todayLocal, collectFee: true },
  })

  const disbursementMethod = useWatch({ control, name: 'disbursementMethod' })

  function handleDisburse(values: DisburseLoanInput) {
    disburseLoan.mutate({ id: loanId, ...values }, { onSuccess })
  }

  return (
    <LoanActionFormShell
      onSubmit={handleSubmit(handleDisburse)}
      error={disburseLoan.error}
      isPending={disburseLoan.isPending}
      pendingLabel="Disbursing..."
      submitLabel="Disburse"
    >
      <Field data-invalid={!!errors.disbursementMethod}>
        <FieldLabel htmlFor="disbursementMethod">Disbursement Method</FieldLabel>
        <Select
          value={disbursementMethod ?? ''}
          onValueChange={(val) =>
            setValue('disbursementMethod', val as DisburseLoanInput['disbursementMethod'], { shouldValidate: true })
          }
        >
          <SelectTrigger id="disbursementMethod">
            <SelectValue placeholder="Select method" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(PAYMENT_METHOD_LABELS) as [DisburseLoanInput['disbursementMethod'], string][]).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError errors={[errors.disbursementMethod]} />
      </Field>

      <Field data-invalid={!!errors.disbursedAt}>
        <FieldLabel htmlFor="disbursedAt">Disbursement Date</FieldLabel>
        <Input
          id="disbursedAt"
          type="date"
          max={todayLocal}
          {...register('disbursedAt')}
        />
        <FieldError errors={[errors.disbursedAt]} />
      </Field>

      {hasFee && (
        <Field>
          <div className="flex items-center gap-2">
            <input id="collectFee" type="checkbox" className="size-4 accent-primary" {...register('collectFee')} />
            <FieldLabel htmlFor="collectFee">
              Collect loan fee of {formatPeso(loanFee!)} on disbursement
            </FieldLabel>
          </div>
        </Field>
      )}

      <Field data-invalid={!!errors.notes}>
        <FieldLabel htmlFor="disburseNotes">Notes (optional)</FieldLabel>
        <Input id="disburseNotes" {...register('notes')} />
        <FieldError errors={[errors.notes]} />
      </Field>
    </LoanActionFormShell>
  )
}
