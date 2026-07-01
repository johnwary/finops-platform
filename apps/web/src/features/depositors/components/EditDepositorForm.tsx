import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { SheetClose, SheetFooter } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { useUpdateDepositor } from '../hooks/useUpdateDepositor'
import { createDepositorSchema, updateDepositorSchema, type CreateDepositorInput, type UpdateDepositorInput } from '../schemas'
import type { Depositor } from '../types'
import { DepositorFormFields } from './DepositorFormFields'

interface EditDepositorFormProps {
  depositor: Depositor
  onSuccess: () => void
}

function toFormValues(d: Depositor): CreateDepositorInput {
  return {
    name: d.name,
    email: d.email,
    phone: d.phone,
    address: d.address,
    dateOfBirth: d.dateOfBirth?.slice(0, 10) ?? undefined,
    idType: d.idType ?? undefined,
    idNumber: d.idNumber ?? undefined,
    notes: d.notes ?? undefined,
  }
}

function diffValues(original: CreateDepositorInput, updated: CreateDepositorInput): UpdateDepositorInput {
  const diff: UpdateDepositorInput = {}
  const keys = Object.keys(updated) as (keyof CreateDepositorInput)[]
  for (const key of keys) {
    const a = original[key]
    const b = updated[key]
    if (a !== b) (diff as Record<string, unknown>)[key] = b
  }
  return diff
}

export function EditDepositorForm({ depositor, onSuccess }: EditDepositorFormProps) {
  const updateDepositor = useUpdateDepositor(depositor.id)
  const defaults = toFormValues(depositor)

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isDirty },
  } = useForm<CreateDepositorInput>({
    resolver: zodResolver(createDepositorSchema) as Resolver<CreateDepositorInput>,
    defaultValues: defaults,
  })

  function handleUpdate(values: CreateDepositorInput) {
    const input = updateDepositorSchema.parse(diffValues(defaults, values))
    if (Object.keys(input).length === 0) return
    updateDepositor.mutate(input, {
      onSuccess: () => onSuccess(),
    })
  }

  return (
    <form onSubmit={handleSubmit(handleUpdate)} className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-6">
        <DepositorFormFields
          register={register}
          setValue={setValue}
          control={control}
          errors={errors}
        />

        {updateDepositor.error ? (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{updateDepositor.error.message}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <SheetFooter className="shrink-0 flex-row justify-end p-6 pt-0">
        <SheetClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </SheetClose>
        <Button type="submit" disabled={updateDepositor.isPending || !isDirty}>
          {updateDepositor.isPending ? <Spinner data-icon="inline-start" /> : null}
          {updateDepositor.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </SheetFooter>
    </form>
  )
}
