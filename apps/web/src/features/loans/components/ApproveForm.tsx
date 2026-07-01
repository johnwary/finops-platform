import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { todayManilaDateString } from '@/lib/format'
import { useApproveLoan } from '../hooks/useApproveLoan'
import { approveLoanSchema, type ApproveLoanInput } from '../schemas'
import { LoanActionFormShell } from './LoanActionFormShell'

interface ApproveFormProps {
  loanId: string
  onSuccess: () => void
}

export function ApproveForm({ loanId, onSuccess }: ApproveFormProps) {
  const approveLoan = useApproveLoan()

  const todayLocal = todayManilaDateString()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApproveLoanInput>({
    resolver: zodResolver(approveLoanSchema),
    defaultValues: { approvedAt: todayLocal },
  })

  function handleApprove(values: ApproveLoanInput) {
    approveLoan.mutate({ id: loanId, ...values }, { onSuccess })
  }

  return (
    <LoanActionFormShell
      onSubmit={handleSubmit(handleApprove)}
      error={approveLoan.error}
      isPending={approveLoan.isPending}
      pendingLabel="Approving..."
      submitLabel="Approve"
    >
      <Field data-invalid={!!errors.approvedAt}>
        <FieldLabel htmlFor="approvedAt">Approval Date</FieldLabel>
        <Input
          id="approvedAt"
          type="date"
          max={todayLocal}
          {...register('approvedAt')}
        />
        <FieldError errors={[errors.approvedAt]} />
      </Field>
    </LoanActionFormShell>
  )
}
