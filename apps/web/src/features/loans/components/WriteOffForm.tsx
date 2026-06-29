import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SheetClose, SheetFooter } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { useWriteOffLoan } from '../hooks/useWriteOffLoan'
import { writeOffLoanSchema, type WriteOffLoanInput } from '../schemas'

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
    <form onSubmit={handleSubmit(handleWriteOff)} className="flex flex-col gap-6 p-6">
      <FieldGroup>
        <Field data-invalid={!!errors.reason}>
          <FieldLabel htmlFor="writeoff-reason">Reason</FieldLabel>
          <Input id="writeoff-reason" {...register('reason')} placeholder="e.g. Unrecoverable after 180+ DPD" />
          <FieldError errors={[errors.reason]} />
        </Field>

        {writeOff.error ? (
          <Alert variant="destructive">
            <AlertDescription>{writeOff.error.message}</AlertDescription>
          </Alert>
        ) : null}
      </FieldGroup>

      <SheetFooter className="flex-row justify-end">
        <SheetClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </SheetClose>
        <Button type="submit" variant="destructive" disabled={writeOff.isPending}>
          {writeOff.isPending ? <Spinner data-icon="inline-start" /> : null}
          {writeOff.isPending ? 'Writing off…' : 'Write Off Loan'}
        </Button>
      </SheetFooter>
    </form>
  )
}
