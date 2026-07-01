import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SheetClose, SheetFooter } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { useCloseDeposit } from '../hooks/useCloseDeposit'
import { closeDepositSchema, type CloseDepositInput } from '../schemas'

interface CloseFormProps {
  depositId: string
  onSuccess: () => void
}

export function CloseForm({ depositId, onSuccess }: CloseFormProps) {
  const closeDeposit = useCloseDeposit(depositId)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CloseDepositInput>({
    resolver: zodResolver(closeDepositSchema),
  })

  function handleClose(values: CloseDepositInput) {
    closeDeposit.mutate(values, { onSuccess })
  }

  return (
    <form onSubmit={handleSubmit(handleClose)} className="flex flex-col gap-6 p-6">
      <FieldGroup>
        <p className="text-sm text-muted-foreground">
          This closes the deposit without a principal payout.
        </p>

        <Field data-invalid={!!errors.notes}>
          <FieldLabel htmlFor="close-notes">Notes (optional)</FieldLabel>
          <Input id="close-notes" {...register('notes')} />
          <FieldError errors={[errors.notes]} />
        </Field>

        {closeDeposit.error ? (
          <Alert variant="destructive">
            <AlertDescription>{closeDeposit.error.message}</AlertDescription>
          </Alert>
        ) : null}
      </FieldGroup>

      <SheetFooter className="flex-row justify-end">
        <SheetClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </SheetClose>
        <Button type="submit" variant="destructive" disabled={closeDeposit.isPending}>
          {closeDeposit.isPending ? <Spinner data-icon="inline-start" /> : null}
          {closeDeposit.isPending ? 'Closing…' : 'Close Deposit'}
        </Button>
      </SheetFooter>
    </form>
  )
}
