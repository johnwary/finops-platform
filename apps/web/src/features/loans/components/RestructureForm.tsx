import { useForm, useWatch } from 'react-hook-form'
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
import { useRestructureLoan } from '../hooks/useRestructureLoan'
import { restructureLoanSchema, type RestructureLoanInput } from '../schemas'
import type { LoanDetail } from '../types'
import { formatPercent, PAYMENT_FREQUENCY_LABELS, REPAYMENT_STRUCTURE_LABELS } from '../utils'

interface RestructureFormProps {
  loan: LoanDetail
  onSuccess: () => void
}

export function RestructureForm({ loan, onSuccess }: RestructureFormProps) {
  const restructure = useRestructureLoan()

  const currentRate = Number(loan.interestRate) * 100

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isDirty },
  } = useForm<RestructureLoanInput>({
    resolver: zodResolver(restructureLoanSchema),
    defaultValues: {
      interestRate: currentRate,
      termMonths: loan.termMonths,
      paymentFrequency: loan.paymentFrequency,
      repaymentStructure: loan.repaymentStructure,
      reason: '',
    },
  })

  const freq = useWatch({ control, name: 'paymentFrequency' })
  const structure = useWatch({ control, name: 'repaymentStructure' })

  function handleRestructure(values: RestructureLoanInput) {
    restructure.mutate({ id: loan.id, ...values }, { onSuccess })
  }

  return (
    <form onSubmit={handleSubmit(handleRestructure)} className="flex flex-col gap-6 p-6 overflow-y-auto">
      <p className="text-sm text-muted-foreground">
        Remaining balance <span className="font-semibold text-foreground">{Number(loan.remainingBalance).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</span> will be rescheduled under new terms. Paid installments are preserved.
      </p>

      <FieldGroup>
        <Field data-invalid={!!errors.interestRate}>
          <FieldLabel htmlFor="r-rate">Interest Rate (% monthly)</FieldLabel>
          <NumericInput
            id="r-rate"
            suffix="%"
            {...register('interestRate', { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">Current: {formatPercent(loan.interestRate)}</p>
          <FieldError errors={[errors.interestRate]} />
        </Field>

        <Field data-invalid={!!errors.termMonths}>
          <FieldLabel htmlFor="r-term">New Term (months)</FieldLabel>
          <Input
            id="r-term"
            type="number"
            min={1}
            max={360}
            {...register('termMonths', { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">Current: {loan.termMonths} months</p>
          <FieldError errors={[errors.termMonths]} />
        </Field>

        <Field data-invalid={!!errors.paymentFrequency}>
          <FieldLabel>Payment Frequency</FieldLabel>
          <Select
            value={freq}
            onValueChange={(v) => setValue('paymentFrequency', v as RestructureLoanInput['paymentFrequency'])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PAYMENT_FREQUENCY_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError errors={[errors.paymentFrequency]} />
        </Field>

        <Field data-invalid={!!errors.repaymentStructure}>
          <FieldLabel>Repayment Structure</FieldLabel>
          <Select
            value={structure}
            onValueChange={(v) => setValue('repaymentStructure', v as RestructureLoanInput['repaymentStructure'])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(REPAYMENT_STRUCTURE_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError errors={[errors.repaymentStructure]} />
        </Field>

        <Field data-invalid={!!errors.reason}>
          <FieldLabel htmlFor="r-reason">Reason</FieldLabel>
          <Input id="r-reason" {...register('reason')} placeholder="e.g. Borrower requested term extension" />
          <FieldError errors={[errors.reason]} />
        </Field>

        {errors.root ? (
          <Alert variant="destructive">
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        ) : null}

        {restructure.error ? (
          <Alert variant="destructive">
            <AlertDescription>{restructure.error.message}</AlertDescription>
          </Alert>
        ) : null}
      </FieldGroup>

      <SheetFooter className="flex-row justify-end">
        <SheetClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </SheetClose>
        <Button type="submit" disabled={restructure.isPending || !isDirty}>
          {restructure.isPending ? <Spinner data-icon="inline-start" /> : null}
          {restructure.isPending ? 'Restructuring…' : 'Restructure Loan'}
        </Button>
      </SheetFooter>
    </form>
  )
}
