import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useCancelLoan } from '../hooks/useCancelLoan'
import { cancelLoanSchema, type CancelLoanInput } from '../schemas'
import { LoanActionFormShell } from './LoanActionFormShell'

interface CancelFormProps {
  loanId: string
  onSuccess: () => void
}

export function CancelForm({ loanId, onSuccess }: CancelFormProps) {
  const cancelLoan = useCancelLoan()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CancelLoanInput>({
    resolver: zodResolver(cancelLoanSchema),
  })

  function handleCancel(values: CancelLoanInput) {
    cancelLoan.mutate({ id: loanId, ...values }, { onSuccess })
  }

  return (
    <LoanActionFormShell
      onSubmit={handleSubmit(handleCancel)}
      error={cancelLoan.error}
      isPending={cancelLoan.isPending}
      pendingLabel="Canceling..."
      submitLabel="Cancel Loan"
      submitVariant="destructive"
    >
      <Field data-invalid={!!errors.cancellationReason}>
        <FieldLabel htmlFor="cancellationReason">Cancellation Reason</FieldLabel>
        <Input id="cancellationReason" {...register('cancellationReason')} />
        <FieldError errors={[errors.cancellationReason]} />
      </Field>
    </LoanActionFormShell>
  )
}
