import { useForm, useWatch } from 'react-hook-form'
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
import { useDisburseLoan } from '../hooks/useDisburseLoan'
import { disburseLoanSchema, type DisburseLoanInput } from '../schemas'
import { PAYMENT_METHOD_LABELS } from '../utils'

interface DisburseFormProps {
  loanId: string
  onSuccess: () => void
}

export function DisburseForm({ loanId, onSuccess }: DisburseFormProps) {
  const disburseLoan = useDisburseLoan()

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<DisburseLoanInput>({
    resolver: zodResolver(disburseLoanSchema),
  })

  const disbursementMethod = useWatch({ control, name: 'disbursementMethod' })

  function handleDisburse(values: DisburseLoanInput) {
    disburseLoan.mutate({ id: loanId, ...values }, { onSuccess })
  }

  return (
    <form onSubmit={handleSubmit(handleDisburse)} className="flex flex-col gap-6 p-6">
      <FieldGroup>
        <Field data-invalid={!!errors.disbursementMethod}>
          <FieldLabel htmlFor="disbursementMethod">Disbursement Method</FieldLabel>
          <Select
            value={disbursementMethod}
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

        <Field data-invalid={!!errors.notes}>
          <FieldLabel htmlFor="disburseNotes">Notes (optional)</FieldLabel>
          <Input id="disburseNotes" {...register('notes')} />
          <FieldError errors={[errors.notes]} />
        </Field>

        {disburseLoan.error ? (
          <Alert variant="destructive">
            <AlertDescription>{disburseLoan.error.message}</AlertDescription>
          </Alert>
        ) : null}
      </FieldGroup>

      <SheetFooter>
        <SheetClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </SheetClose>
        <Button type="submit" disabled={disburseLoan.isPending}>
          {disburseLoan.isPending ? <Spinner data-icon="inline-start" /> : null}
          {disburseLoan.isPending ? 'Disbursing…' : 'Disburse'}
        </Button>
      </SheetFooter>
    </form>
  )
}
