import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { SheetClose, SheetFooter } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { isConflictError } from '@/lib/api'
import { useUpdateBorrower } from '../hooks/useUpdateBorrower'
import { createBorrowerSchema, updateBorrowerSchema, type CreateBorrowerInput, type UpdateBorrowerInput } from '../schemas'
import type { BorrowerDetail } from '../types'
import { applyBorrowerConflictErrors } from '../utils'
import { BorrowerFormFields } from './BorrowerFormFields'

interface EditBorrowerFormProps {
  borrower: BorrowerDetail
  onSuccess: () => void
}

function toFormValues(b: BorrowerDetail): CreateBorrowerInput {
  return {
    firstName: b.firstName,
    middleName: b.middleName ?? undefined,
    lastName: b.lastName,
    email: b.email,
    phone: b.phone,
    address: b.address,
    dateOfBirth: b.dateOfBirth.slice(0, 10),
    gender: b.gender,
    idType: b.idType,
    idNumber: b.idNumber,
    occupation: b.occupation ?? undefined,
    incomeSource: b.incomeSource,
    monthlyIncome: b.monthlyIncome != null ? Number(b.monthlyIncome) : undefined,
    emergencyContactName: b.emergencyContactName ?? undefined,
    emergencyContactPhone: b.emergencyContactPhone ?? undefined,
    notes: b.notes ?? undefined,
  }
}

function diffValues(original: CreateBorrowerInput, updated: CreateBorrowerInput): UpdateBorrowerInput {
  const diff: UpdateBorrowerInput = {}
  const keys = Object.keys(updated) as (keyof CreateBorrowerInput)[]
  for (const key of keys) {
    const a = original[key]
    const b = updated[key]
    if (a !== b) (diff as Record<string, unknown>)[key] = b
  }
  return diff
}

export function EditBorrowerForm({ borrower, onSuccess }: EditBorrowerFormProps) {
  const updateBorrower = useUpdateBorrower()
  const defaults = toFormValues(borrower)

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    control,
    formState: { errors },
  } = useForm<CreateBorrowerInput>({
    resolver: zodResolver(createBorrowerSchema) as Resolver<CreateBorrowerInput>,
    defaultValues: defaults,
  })

  function handleUpdate(values: CreateBorrowerInput) {
    const input = updateBorrowerSchema.parse(diffValues(defaults, values))
    updateBorrower.mutate(
      { id: borrower.id, input },
      {
        onSuccess: () => onSuccess(),
        onError: (err) => applyBorrowerConflictErrors(err, setError),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit(handleUpdate)} className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-6">
        <BorrowerFormFields
          register={register}
          setValue={setValue}
          control={control}
          errors={errors}
        />

        {updateBorrower.error && !isConflictError(updateBorrower.error) ? (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{updateBorrower.error.message}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <SheetFooter className="shrink-0 flex-row justify-end p-6 pt-0">
        <SheetClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </SheetClose>
        <Button type="submit" disabled={updateBorrower.isPending}>
          {updateBorrower.isPending ? <Spinner data-icon="inline-start" /> : null}
          {updateBorrower.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </SheetFooter>
    </form>
  )
}
