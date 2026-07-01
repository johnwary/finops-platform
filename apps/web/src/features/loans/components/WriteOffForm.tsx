import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useWriteOffLoan } from '../hooks/useWriteOffLoan'
import { writeOffLoanSchema, type WriteOffLoanInput } from '../schemas'
import { LoanActionFormShell } from './LoanActionFormShell'

interface WriteOffFormProps {
  loanId: string
  onSuccess: () => void
}

export function WriteOffForm({ loanId, onSuccess }: WriteOffFormProps) {
  const writeOff = useWriteOffLoan()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WriteOffLoanInput>({
    resolver: zodResolver(writeOffLoanSchema),
  })

  function handleWriteOff(values: WriteOffLoanInput) {
    writeOff.mutate({ id: loanId, ...values }, { onSuccess })
  }

  return (
    <LoanActionFormShell
      onSubmit={handleSubmit(handleWriteOff)}
      error={writeOff.error}
      isPending={writeOff.isPending}
      pendingLabel="Writing off..."
      submitLabel="Write Off Loan"
      submitVariant="destructive"
    >
      <Field data-invalid={!!errors.reason}>
        <FieldLabel htmlFor="writeoff-reason">Reason</FieldLabel>
        <Input id="writeoff-reason" {...register('reason')} placeholder="e.g. Unrecoverable after 180+ DPD" />
        <FieldError errors={[errors.reason]} />
      </Field>
    </LoanActionFormShell>
  )
}
