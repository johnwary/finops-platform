import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SheetClose, SheetFooter } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { todayManilaDateString } from '@/lib/format'
import { useApproveLoan } from '../hooks/useApproveLoan'
import { approveLoanSchema, type ApproveLoanInput } from '../schemas'

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
    <form onSubmit={handleSubmit(handleApprove)} className="flex flex-col gap-6 p-6">
      <FieldGroup>
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

        {approveLoan.error ? (
          <Alert variant="destructive">
            <AlertDescription>{approveLoan.error.message}</AlertDescription>
          </Alert>
        ) : null}
      </FieldGroup>

      <SheetFooter className="flex-row justify-end">
        <SheetClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </SheetClose>
        <Button type="submit" disabled={approveLoan.isPending}>
          {approveLoan.isPending ? <Spinner data-icon="inline-start" /> : null}
          {approveLoan.isPending ? 'Approving…' : 'Approve'}
        </Button>
      </SheetFooter>
    </form>
  )
}
