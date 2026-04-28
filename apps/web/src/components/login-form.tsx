import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import heroUrl from '@/assets/login-image.jpg';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { loginSchema, type LoginInput } from '@/features/auth/schemas';
import { useLogin } from '@/features/auth/hooks/useLogin';

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const login = useLogin();
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
  });

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form
            className="p-6 md:p-8"
            onSubmit={handleSubmit((values) => login.mutate(values))}
          >
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-balance text-muted-foreground">
                  Sign in to your FinOps Platform account.
                </p>
              </div>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  {...register('email')}
                />
                <FieldError errors={[errors.email]} />
              </Field>
              <Field data-invalid={!!errors.password}>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                </div>
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

              <Field>
                <Button type="submit" size="lg" disabled={login.isPending}>
                  {login.isPending ? (
                    <Spinner data-icon="inline-start" />
                  ) : null}
                  {login.isPending ? 'Signing in...' : 'Sign in'}
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Access is invitation-only. Ask an admin to invite your account.
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="relative hidden bg-muted md:block">
            <img
              src={heroUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.25] dark:grayscale"
            />
            <div className="absolute inset-0 bg-linear-to-br from-primary/55 via-accent/35 to-background/20 mix-blend-multiply dark:from-background/75 dark:via-primary/35 dark:to-accent/20 dark:mix-blend-normal" />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By continuing, you agree to use FinOps Platform according to your
        organization&apos;s access policies.
      </FieldDescription>
    </div>
  );
}
