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
import {
  SheetClose,
  SheetFooter,
} from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { useCreateLoan } from '../hooks/useCreateLoan'
import { createLoanSchema, type CreateLoanInput } from '../schemas'
import {
  LOAN_TYPE_LABELS,
  PAYMENT_FREQUENCY_LABELS,
  REPAYMENT_STRUCTURE_LABELS,
} from '../utils'
import { BorrowerSearchField } from './BorrowerSearchField'

interface CreateLoanFormProps {
  onSuccess: () => void
}

const optionalNumber = {
  setValueAs: (value: string) => (value === '' ? undefined : Number(value)),
}

export function CreateLoanForm({ onSuccess }: CreateLoanFormProps) {
  const createLoan = useCreateLoan()

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateLoanInput>({
    resolver: zodResolver(createLoanSchema) as Resolver<CreateLoanInput>,
    defaultValues: {
      paymentFrequency: 'MONTHLY',
      repaymentStructure: 'AMORTIZING',
    },
  })

  const type = useWatch({ control, name: 'type' })
  const paymentFrequency = useWatch({ control, name: 'paymentFrequency' })
  const repaymentStructure = useWatch({ control, name: 'repaymentStructure' })
  const amount = useWatch({ control, name: 'amount' })
  const loanFee = useWatch({ control, name: 'loanFee' })

  function handleCreate(values: CreateLoanInput) {
    createLoan.mutate(values, {
      onSuccess: () => {
        reset()
        onSuccess()
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(handleCreate)} className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-6">
        <FieldGroup>
          <BorrowerSearchField
            onChange={(id) => setValue('borrowerId', id, { shouldValidate: true })}
            error={errors.borrowerId}
          />

          <Field data-invalid={!!errors.type}>
            <FieldLabel htmlFor="type">Loan Type</FieldLabel>
            <Select
              value={type ?? ''}
              onValueChange={(val) =>
                setValue('type', val as CreateLoanInput['type'], { shouldValidate: true })
              }
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(LOAN_TYPE_LABELS) as [CreateLoanInput['type'], string][]).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[errors.type]} />
          </Field>

          <Field data-invalid={!!errors.amount}>
            <FieldLabel htmlFor="amount">Amount (₱)</FieldLabel>
            <NumericInput
              id="amount"
              placeholder="0.00"
              value={amount ?? undefined}
              onChange={(val) => setValue('amount', val as number, { shouldValidate: true })}
              aria-invalid={!!errors.amount}
            />
            <FieldError errors={[errors.amount]} />
          </Field>

          <Field data-invalid={!!errors.interestRate}>
            <FieldLabel htmlFor="interestRate">Interest Rate (%)</FieldLabel>
            <Input
              id="interestRate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="e.g. 3 for 3%"
              {...register('interestRate', { valueAsNumber: true })}
            />
            <FieldError errors={[errors.interestRate]} />
          </Field>

          <Field data-invalid={!!errors.termMonths}>
            <FieldLabel htmlFor="termMonths">Term (months)</FieldLabel>
            <Input id="termMonths" type="number" min="1" max="360" {...register('termMonths', { valueAsNumber: true })} />
            <FieldError errors={[errors.termMonths]} />
          </Field>

          <Field data-invalid={!!errors.applicationDate}>
            <FieldLabel htmlFor="applicationDate">Application Date</FieldLabel>
            <Input id="applicationDate" type="date" {...register('applicationDate')} />
            <FieldError errors={[errors.applicationDate]} />
          </Field>

          <Field data-invalid={!!errors.paymentFrequency}>
            <FieldLabel htmlFor="paymentFrequency">Payment Frequency</FieldLabel>
            <Select
              value={paymentFrequency ?? ''}
              onValueChange={(val) =>
                setValue('paymentFrequency', val as CreateLoanInput['paymentFrequency'], { shouldValidate: true })
              }
            >
              <SelectTrigger id="paymentFrequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(PAYMENT_FREQUENCY_LABELS) as [CreateLoanInput['paymentFrequency'], string][]).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[errors.paymentFrequency]} />
          </Field>

          <Field data-invalid={!!errors.repaymentStructure}>
            <FieldLabel htmlFor="repaymentStructure">Repayment Structure</FieldLabel>
            <Select
              value={repaymentStructure ?? ''}
              onValueChange={(val) =>
                setValue('repaymentStructure', val as CreateLoanInput['repaymentStructure'], { shouldValidate: true })
              }
            >
              <SelectTrigger id="repaymentStructure">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(REPAYMENT_STRUCTURE_LABELS) as [CreateLoanInput['repaymentStructure'], string][]).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[errors.repaymentStructure]} />
          </Field>

          <Field data-invalid={!!errors.loanFee}>
            <FieldLabel htmlFor="loanFee">Loan Fee (₱, optional)</FieldLabel>
            <NumericInput
              id="loanFee"
              placeholder="0.00"
              value={loanFee ?? undefined}
              onChange={(val) => setValue('loanFee', val, { shouldValidate: true })}
              aria-invalid={!!errors.loanFee}
            />
            <FieldError errors={[errors.loanFee]} />
          </Field>

          <Field data-invalid={!!errors.penaltyRate}>
            <FieldLabel htmlFor="penaltyRate">Penalty Rate (%, optional)</FieldLabel>
            <Input
              id="penaltyRate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="Daily penalty %"
              {...register('penaltyRate', optionalNumber)}
            />
            <FieldError errors={[errors.penaltyRate]} />
          </Field>

          <Field data-invalid={!!errors.purpose}>
            <FieldLabel htmlFor="purpose">Purpose (optional)</FieldLabel>
            <Input id="purpose" {...register('purpose')} />
            <FieldError errors={[errors.purpose]} />
          </Field>

          <Field data-invalid={!!errors.notes}>
            <FieldLabel htmlFor="notes">Notes (optional)</FieldLabel>
            <Input id="notes" {...register('notes')} />
            <FieldError errors={[errors.notes]} />
          </Field>

          {createLoan.error ? (
            <Alert variant="destructive">
              <AlertDescription>{createLoan.error.message}</AlertDescription>
            </Alert>
          ) : null}
        </FieldGroup>
      </div>

      <SheetFooter className="shrink-0 flex-row justify-end p-6 pt-0">
        <SheetClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </SheetClose>
        <Button type="submit" disabled={createLoan.isPending}>
          {createLoan.isPending ? <Spinner data-icon="inline-start" /> : null}
          {createLoan.isPending ? 'Creating…' : 'Create Loan'}
        </Button>
      </SheetFooter>
    </form>
  )
}
