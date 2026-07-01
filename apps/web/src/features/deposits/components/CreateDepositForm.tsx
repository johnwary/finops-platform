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
import { useCreateDeposit } from '../hooks/useCreateDeposit'
import { createDepositSchema, type CreateDepositInput } from '../schemas'
import {
  DEPOSIT_PAYOUT_TYPE_LABELS,
  DEPOSIT_RETURN_RATE_PERIOD_LABELS,
  DEPOSIT_TYPE_LABELS,
} from '../utils'
import { DepositorSearchField } from './DepositorSearchField'

interface CreateDepositFormProps {
  onSuccess: () => void
}

export function CreateDepositForm({ onSuccess }: CreateDepositFormProps) {
  const createDeposit = useCreateDeposit()

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateDepositInput>({
    resolver: zodResolver(createDepositSchema) as Resolver<CreateDepositInput>,
    defaultValues: {
      expectedReturnRatePeriod: 'MONTH',
      depositType: 'REGULAR',
      payoutType: 'MATURITY_ONLY',
    },
  })

  const amount = useWatch({ control, name: 'amount' })
  const expectedReturnRatePeriod = useWatch({ control, name: 'expectedReturnRatePeriod' })
  const depositType = useWatch({ control, name: 'depositType' })
  const payoutType = useWatch({ control, name: 'payoutType' })

  function handleCreate(values: CreateDepositInput) {
    createDeposit.mutate(values, {
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
          <DepositorSearchField
            onChange={(id) => setValue('depositorId', id, { shouldValidate: true })}
            error={errors.depositorId}
          />

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

          <Field data-invalid={!!errors.expectedReturnRate}>
            <FieldLabel htmlFor="expectedReturnRate">Expected Return Rate (%)</FieldLabel>
            <Input
              id="expectedReturnRate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="e.g. 6 for 6%"
              {...register('expectedReturnRate', { valueAsNumber: true })}
            />
            <FieldError errors={[errors.expectedReturnRate]} />
          </Field>

          <Field data-invalid={!!errors.expectedReturnRatePeriod}>
            <FieldLabel htmlFor="expectedReturnRatePeriod">Rate Period</FieldLabel>
            <Select
              value={expectedReturnRatePeriod ?? ''}
              onValueChange={(val) =>
                setValue('expectedReturnRatePeriod', val as CreateDepositInput['expectedReturnRatePeriod'], { shouldValidate: true })
              }
            >
              <SelectTrigger id="expectedReturnRatePeriod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(DEPOSIT_RETURN_RATE_PERIOD_LABELS) as [CreateDepositInput['expectedReturnRatePeriod'], string][]).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[errors.expectedReturnRatePeriod]} />
          </Field>

          <Field data-invalid={!!errors.termMonths}>
            <FieldLabel htmlFor="termMonths">Term (months)</FieldLabel>
            <Input id="termMonths" type="number" min="1" max="360" {...register('termMonths', { valueAsNumber: true })} />
            <FieldError errors={[errors.termMonths]} />
          </Field>

          <Field data-invalid={!!errors.startDate}>
            <FieldLabel htmlFor="startDate">Start Date</FieldLabel>
            <Input id="startDate" type="date" {...register('startDate')} />
            <FieldError errors={[errors.startDate]} />
          </Field>

          <Field data-invalid={!!errors.depositType}>
            <FieldLabel htmlFor="depositType">Deposit Type</FieldLabel>
            <Select
              value={depositType ?? ''}
              onValueChange={(val) =>
                setValue('depositType', val as CreateDepositInput['depositType'], { shouldValidate: true })
              }
            >
              <SelectTrigger id="depositType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(DEPOSIT_TYPE_LABELS) as [CreateDepositInput['depositType'], string][]).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[errors.depositType]} />
          </Field>

          <Field data-invalid={!!errors.payoutType}>
            <FieldLabel htmlFor="payoutType">Payout Type</FieldLabel>
            <Select
              value={payoutType ?? ''}
              onValueChange={(val) =>
                setValue('payoutType', val as CreateDepositInput['payoutType'], { shouldValidate: true })
              }
            >
              <SelectTrigger id="payoutType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(DEPOSIT_PAYOUT_TYPE_LABELS) as [CreateDepositInput['payoutType'], string][]).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[errors.payoutType]} />
          </Field>

          <Field data-invalid={!!errors.reference}>
            <FieldLabel htmlFor="reference">Reference (optional)</FieldLabel>
            <Input id="reference" {...register('reference')} />
            <FieldError errors={[errors.reference]} />
          </Field>

          <Field data-invalid={!!errors.notes}>
            <FieldLabel htmlFor="notes">Notes (optional)</FieldLabel>
            <Input id="notes" {...register('notes')} />
            <FieldError errors={[errors.notes]} />
          </Field>

          {createDeposit.error ? (
            <Alert variant="destructive">
              <AlertDescription>{createDeposit.error.message}</AlertDescription>
            </Alert>
          ) : null}
        </FieldGroup>
      </div>

      <SheetFooter className="shrink-0 flex-row justify-end p-6 pt-0">
        <SheetClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </SheetClose>
        <Button type="submit" disabled={createDeposit.isPending}>
          {createDeposit.isPending ? <Spinner data-icon="inline-start" /> : null}
          {createDeposit.isPending ? 'Creating…' : 'Create Deposit'}
        </Button>
      </SheetFooter>
    </form>
  )
}
