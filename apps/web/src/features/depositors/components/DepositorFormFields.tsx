import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
} from 'react-hook-form'
import { useWatch } from 'react-hook-form'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CreateDepositorInput } from '../schemas'
import type { IdType } from '../types'
import { ID_TYPE_LABELS } from '../utils'

interface DepositorFormFieldsProps {
  register: UseFormRegister<CreateDepositorInput>
  setValue: UseFormSetValue<CreateDepositorInput>
  control: Control<CreateDepositorInput>
  errors: FieldErrors<CreateDepositorInput>
}

export function DepositorFormFields({ register, setValue, control, errors }: DepositorFormFieldsProps) {
  const idType = useWatch({ control, name: 'idType' })

  return (
    <FieldGroup>
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input id="name" {...register('name')} />
        <FieldError errors={[errors.name]} />
      </Field>

      <Field data-invalid={!!errors.email}>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input id="email" type="email" autoComplete="off" {...register('email')} />
        <FieldError errors={[errors.email]} />
      </Field>

      <Field data-invalid={!!errors.phone}>
        <FieldLabel htmlFor="phone">Phone</FieldLabel>
        <Input id="phone" placeholder="09XXXXXXXXX or +639XXXXXXXXX" {...register('phone')} />
        <FieldError errors={[errors.phone]} />
      </Field>

      <Field data-invalid={!!errors.address}>
        <FieldLabel htmlFor="address">Address</FieldLabel>
        <Input id="address" {...register('address')} />
        <FieldError errors={[errors.address]} />
      </Field>

      <Field data-invalid={!!errors.dateOfBirth}>
        <FieldLabel htmlFor="dateOfBirth">Date of birth (optional)</FieldLabel>
        <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
        <FieldError errors={[errors.dateOfBirth]} />
      </Field>

      <Field data-invalid={!!errors.idType}>
        <FieldLabel htmlFor="idType">ID type (optional)</FieldLabel>
        <Select
          value={idType ?? ''}
          onValueChange={(val) =>
            setValue('idType', val as CreateDepositorInput['idType'], { shouldValidate: true, shouldDirty: true })
          }
        >
          <SelectTrigger id="idType">
            <SelectValue placeholder="Select ID type" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(ID_TYPE_LABELS) as [IdType, string][]).map(
              ([val, label]) => (
                <SelectItem key={val} value={val}>
                  {label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        <FieldError errors={[errors.idType]} />
      </Field>

      <Field data-invalid={!!errors.idNumber}>
        <FieldLabel htmlFor="idNumber">ID number (optional)</FieldLabel>
        <Input id="idNumber" {...register('idNumber')} />
        <FieldError errors={[errors.idNumber]} />
      </Field>

      <Field data-invalid={!!errors.notes}>
        <FieldLabel htmlFor="notes">Notes (optional)</FieldLabel>
        <Input id="notes" {...register('notes')} />
        <FieldError errors={[errors.notes]} />
      </Field>
    </FieldGroup>
  )
}
