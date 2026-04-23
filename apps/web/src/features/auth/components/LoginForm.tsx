import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { loginSchema, type LoginInput } from '../schemas'
import { useLogin } from '../hooks/useLogin'

export function LoginForm() {
  const login = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  return (
    <form onSubmit={handleSubmit((values) => login.mutate(values))}>
      <FieldGroup>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register('email')} />
          <FieldError errors={[errors.email]} />
        </Field>

        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          <FieldError errors={[errors.password]} />
        </Field>

        {login.error ? (
          <Alert variant="destructive">
            <AlertDescription>{login.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" size="lg" disabled={login.isPending}>
          {login.isPending ? <Spinner data-icon="inline-start" /> : null}
          {login.isPending ? 'Signing in...' : 'Sign in'}
        </Button>
      </FieldGroup>
    </form>
  )
}
