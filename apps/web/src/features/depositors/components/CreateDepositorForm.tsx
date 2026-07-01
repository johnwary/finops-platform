import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { SheetClose, SheetFooter } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { useCreateDepositor } from '../hooks/useCreateDepositor'
import { createDepositorSchema, type CreateDepositorInput } from '../schemas'
import { DepositorFormFields } from './DepositorFormFields'

interface CreateDepositorFormProps {
  onSuccess: () => void
}

export function CreateDepositorForm({ onSuccess }: CreateDepositorFormProps) {
  const createDepositor = useCreateDepositor()

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateDepositorInput>({
    resolver: zodResolver(createDepositorSchema) as Resolver<CreateDepositorInput>,
  })

  function handleCreate(values: CreateDepositorInput) {
    createDepositor.mutate(values, {
      onSuccess: () => {
        reset()
        onSuccess()
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(handleCreate)} className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-6">
        <DepositorFormFields
          register={register}
          setValue={setValue}
          control={control}
          errors={errors}
        />

        {createDepositor.error ? (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{createDepositor.error.message}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <SheetFooter className="shrink-0 flex-row justify-end p-6 pt-0">
        <SheetClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </SheetClose>
        <Button type="submit" disabled={createDepositor.isPending}>
          {createDepositor.isPending ? <Spinner data-icon="inline-start" /> : null}
          {createDepositor.isPending ? 'Creating…' : 'Create Depositor'}
        </Button>
      </SheetFooter>
    </form>
  )
}
