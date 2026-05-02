import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SheetClose, SheetFooter } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { useCancelLoan } from '../hooks/useCancelLoan'
import { cancelLoanSchema, type CancelLoanInput } from '../schemas'

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
    <form onSubmit={handleSubmit(handleCancel)} className="flex flex-col gap-6 p-6">
      <FieldGroup>
        <Field data-invalid={!!errors.cancellationReason}>
          <FieldLabel htmlFor="cancellationReason">Cancellation Reason</FieldLabel>
          <Input id="cancellationReason" {...register('cancellationReason')} />
          <FieldError errors={[errors.cancellationReason]} />
        </Field>

        {cancelLoan.error ? (
          <Alert variant="destructive">
            <AlertDescription>{cancelLoan.error.message}</AlertDescription>
          </Alert>
        ) : null}
      </FieldGroup>

      <SheetFooter>
        <SheetClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </SheetClose>
        <Button type="submit" variant="destructive" disabled={cancelLoan.isPending}>
          {cancelLoan.isPending ? <Spinner data-icon="inline-start" /> : null}
          {cancelLoan.isPending ? 'Canceling…' : 'Cancel Loan'}
        </Button>
      </SheetFooter>
    </form>
  )
}
