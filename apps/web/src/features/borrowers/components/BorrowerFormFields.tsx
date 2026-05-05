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
import { Separator } from '@/components/ui/separator'
import type { CreateBorrowerInput } from '../schemas'
import {
  GENDER_LABELS,
  ID_TYPE_LABELS,
  INCOME_SOURCE_LABELS,
  optionalNumber,
} from '../utils'

interface BorrowerFormFieldsProps {
  register: UseFormRegister<CreateBorrowerInput>
  setValue: UseFormSetValue<CreateBorrowerInput>
  control: Control<CreateBorrowerInput>
  errors: FieldErrors<CreateBorrowerInput>
}

export function BorrowerFormFields({ register, setValue, control, errors }: BorrowerFormFieldsProps) {
  const gender = useWatch({ control, name: 'gender' })
  const idType = useWatch({ control, name: 'idType' })
  const incomeSource = useWatch({ control, name: 'incomeSource' })

  return (
    <FieldGroup>
      <SectionLabel>Identity</SectionLabel>

      <Field data-invalid={!!errors.lastName}>
        <FieldLabel htmlFor="lastName">Last name</FieldLabel>
        <Input id="lastName" {...register('lastName')} />
        <FieldError errors={[errors.lastName]} />
      </Field>

      <Field data-invalid={!!errors.firstName}>
        <FieldLabel htmlFor="firstName">First name</FieldLabel>
        <Input id="firstName" {...register('firstName')} />
        <FieldError errors={[errors.firstName]} />
      </Field>

      <Field data-invalid={!!errors.middleName}>
        <FieldLabel htmlFor="middleName">Middle name (optional)</FieldLabel>
        <Input id="middleName" {...register('middleName')} />
        <FieldError errors={[errors.middleName]} />
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

      <Separator className="my-2" />
      <SectionLabel>KYC</SectionLabel>

      <Field data-invalid={!!errors.dateOfBirth}>
        <FieldLabel htmlFor="dateOfBirth">Date of birth</FieldLabel>
        <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
        <FieldError errors={[errors.dateOfBirth]} />
      </Field>

      <Field data-invalid={!!errors.gender}>
        <FieldLabel htmlFor="gender">Gender</FieldLabel>
        <Select
          value={gender ?? ''}
          onValueChange={(val) =>
            setValue('gender', val as CreateBorrowerInput['gender'], { shouldValidate: true })
          }
        >
          <SelectTrigger id="gender">
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(GENDER_LABELS) as [CreateBorrowerInput['gender'], string][]).map(
              ([val, label]) => (
                <SelectItem key={val} value={val}>
                  {label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        <FieldError errors={[errors.gender]} />
      </Field>

      <Field data-invalid={!!errors.idType}>
        <FieldLabel htmlFor="idType">ID type</FieldLabel>
        <Select
          value={idType ?? ''}
          onValueChange={(val) =>
            setValue('idType', val as CreateBorrowerInput['idType'], { shouldValidate: true })
          }
        >
          <SelectTrigger id="idType">
            <SelectValue placeholder="Select ID type" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(ID_TYPE_LABELS) as [CreateBorrowerInput['idType'], string][]).map(
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
        <FieldLabel htmlFor="idNumber">ID number</FieldLabel>
        <Input id="idNumber" {...register('idNumber')} />
        <FieldError errors={[errors.idNumber]} />
      </Field>

      <Field data-invalid={!!errors.address}>
        <FieldLabel htmlFor="address">Address</FieldLabel>
        <Input id="address" {...register('address')} />
        <FieldError errors={[errors.address]} />
      </Field>

      <Separator className="my-2" />
      <SectionLabel>Income</SectionLabel>

      <Field data-invalid={!!errors.occupation}>
        <FieldLabel htmlFor="occupation">Occupation (optional)</FieldLabel>
        <Input id="occupation" {...register('occupation')} />
        <FieldError errors={[errors.occupation]} />
      </Field>

      <Field data-invalid={!!errors.incomeSource}>
        <FieldLabel htmlFor="incomeSource">Income source</FieldLabel>
        <Select
          value={incomeSource ?? ''}
          onValueChange={(val) =>
            setValue('incomeSource', val as CreateBorrowerInput['incomeSource'], {
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger id="incomeSource">
            <SelectValue placeholder="Select source" />
          </SelectTrigger>
          <SelectContent>
            {(
              Object.entries(INCOME_SOURCE_LABELS) as [CreateBorrowerInput['incomeSource'], string][]
            ).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError errors={[errors.incomeSource]} />
      </Field>

      <Field data-invalid={!!errors.monthlyIncome}>
        <FieldLabel htmlFor="monthlyIncome">Monthly income (₱, optional)</FieldLabel>
        <Input
          id="monthlyIncome"
          type="number"
          min="0"
          step="0.01"
          {...register('monthlyIncome', optionalNumber)}
        />
        <FieldError errors={[errors.monthlyIncome]} />
      </Field>

      <Separator className="my-2" />
      <SectionLabel>Emergency contact</SectionLabel>

      <Field data-invalid={!!errors.emergencyContactName}>
        <FieldLabel htmlFor="emergencyContactName">Name (optional)</FieldLabel>
        <Input id="emergencyContactName" {...register('emergencyContactName')} />
        <FieldError errors={[errors.emergencyContactName]} />
      </Field>

      <Field data-invalid={!!errors.emergencyContactPhone}>
        <FieldLabel htmlFor="emergencyContactPhone">Phone (optional)</FieldLabel>
        <Input
          id="emergencyContactPhone"
          placeholder="09XXXXXXXXX"
          {...register('emergencyContactPhone')}
        />
        <FieldError errors={[errors.emergencyContactPhone]} />
      </Field>

      <Separator className="my-2" />
      <SectionLabel>Notes</SectionLabel>

      <Field data-invalid={!!errors.notes}>
        <FieldLabel htmlFor="notes">Notes (optional)</FieldLabel>
        <Input id="notes" {...register('notes')} />
        <FieldError errors={[errors.notes]} />
      </Field>
    </FieldGroup>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  )
}
