import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import { UserIcon, LockIcon } from '@hugeicons/core-free-icons'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
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
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Welcome!</h1>
        </div>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <div className="relative">
            <HugeiconsIcon
              icon={UserIcon}
              size={16}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              className="pl-7"
              {...register('email')}
            />
          </div>
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <div className="relative">
            <HugeiconsIcon
              icon={LockIcon}
              size={16}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              className="pl-7"
              {...register('password')}
            />
          </div>
          <FieldError errors={[errors.password]} />
          <Link
            to="/forgot-password"
            className="text-right text-xs text-muted-foreground underline underline-offset-4"
          >
            Forgot password?
          </Link>
        </Field>

        {login.error ? (
          <Alert variant="destructive">
            <AlertDescription>{login.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <Field>
          <Button type="submit" size="lg" disabled={login.isPending}>
            {login.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : null}
            {login.isPending ? 'Logging in...' : 'Log in'}
          </Button>
        </Field>
        <FieldDescription className="text-center">
          Access is invitation-only. Email johnwary@gmail.com.
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
