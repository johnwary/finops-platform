import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { SheetClose, SheetFooter } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { ApiError } from '@/lib/api'
import { useCreateBorrower } from '../hooks/useCreateBorrower'
import { createBorrowerSchema, type CreateBorrowerInput } from '../schemas'
import { BorrowerFormFields } from './BorrowerFormFields'

interface CreateBorrowerFormProps {
  onSuccess: () => void
}

export function CreateBorrowerForm({ onSuccess }: CreateBorrowerFormProps) {
  const createBorrower = useCreateBorrower()

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateBorrowerInput>({
    resolver: zodResolver(createBorrowerSchema) as Resolver<CreateBorrowerInput>,
  })

  function handleCreate(values: CreateBorrowerInput) {
    createBorrower.mutate(values, {
      onSuccess: () => {
        reset()
        onSuccess()
      },
      onError: (err) => {
        if (err instanceof ApiError && err.code === 'CONFLICT') {
          if (err.message.toLowerCase().includes('email')) {
            setError('email', { message: err.message })
          } else if (err.message.toLowerCase().includes('id number')) {
            setError('idNumber', { message: err.message })
          }
        }
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(handleCreate)} className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-6">
        <BorrowerFormFields
          register={register}
          setValue={setValue}
          control={control}
          errors={errors}
        />

        {createBorrower.error && !(createBorrower.error instanceof ApiError && createBorrower.error.code === 'CONFLICT') ? (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{createBorrower.error.message}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <SheetFooter className="shrink-0 flex-row justify-end p-6 pt-0">
        <SheetClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </SheetClose>
        <Button type="submit" disabled={createBorrower.isPending}>
          {createBorrower.isPending ? <Spinner data-icon="inline-start" /> : null}
          {createBorrower.isPending ? 'Creating…' : 'Create Borrower'}
        </Button>
      </SheetFooter>
    </form>
  )
}
