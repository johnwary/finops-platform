import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SheetClose, SheetFooter } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { useWithdrawDeposit } from '../hooks/useWithdrawDeposit'
import { withdrawDepositSchema, type WithdrawDepositInput } from '../schemas'

interface WithdrawFormProps {
  depositId: string
  onSuccess: () => void
}

export function WithdrawForm({ depositId, onSuccess }: WithdrawFormProps) {
  const withdrawDeposit = useWithdrawDeposit(depositId)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WithdrawDepositInput>({
    resolver: zodResolver(withdrawDepositSchema),
  })

  function handleWithdraw(values: WithdrawDepositInput) {
    withdrawDeposit.mutate(values, { onSuccess })
  }

  return (
    <form onSubmit={handleSubmit(handleWithdraw)} className="flex flex-col gap-6 p-6">
      <FieldGroup>
        <p className="text-sm text-muted-foreground">
          This returns principal to the depositor and closes the deposit.
        </p>

        <Field data-invalid={!!errors.notes}>
          <FieldLabel htmlFor="withdraw-notes">Notes (optional)</FieldLabel>
          <Input id="withdraw-notes" {...register('notes')} />
          <FieldError errors={[errors.notes]} />
        </Field>

        {withdrawDeposit.error ? (
          <Alert variant="destructive">
            <AlertDescription>{withdrawDeposit.error.message}</AlertDescription>
          </Alert>
        ) : null}
      </FieldGroup>

      <SheetFooter className="flex-row justify-end">
        <SheetClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </SheetClose>
        <Button type="submit" variant="destructive" disabled={withdrawDeposit.isPending}>
          {withdrawDeposit.isPending ? <Spinner data-icon="inline-start" /> : null}
          {withdrawDeposit.isPending ? 'Withdrawing…' : 'Withdraw Deposit'}
        </Button>
      </SheetFooter>
    </form>
  )
}
