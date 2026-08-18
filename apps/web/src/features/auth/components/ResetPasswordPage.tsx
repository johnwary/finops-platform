import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { authClient } from '@/lib/auth-client'

const schema = z
  .object({
    password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })

type Input = z.infer<typeof schema>

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [done, setDone] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<Input>({
    resolver: zodResolver(schema),
  })

  async function handleReset(values: Input) {
    const result = await authClient.resetPassword({ newPassword: values.password, token })
    if (result.error) {
      setError('root', { message: result.error.message ?? 'Reset failed. The link may have expired.' })
      return
    }
    setDone(true)
  }

  if (!token) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted p-6">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 text-center flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Invalid or missing reset token.</p>
            <Button asChild variant="outline"><Link to="/login">Back to log in</Link></Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted p-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <Card>
          <CardContent className="p-6 md:p-8">
            {done ? (
              <div className="flex flex-col gap-4 text-center">
                <h1 className="text-xl font-bold">Password updated</h1>
                <p className="text-sm text-muted-foreground">Your password has been reset. You can now log in.</p>
                <Button asChild><Link to="/login">Log in</Link></Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(handleReset)}>
                <FieldGroup>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold">Set new password</h1>
                    <p className="text-sm text-muted-foreground">Choose a new password for your account.</p>
                  </div>
                  <Field data-invalid={!!errors.password}>
                    <FieldLabel htmlFor="password">New password</FieldLabel>
                    <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
                    <FieldError errors={[errors.password]} />
                  </Field>
                  <Field data-invalid={!!errors.confirm}>
                    <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
                    <Input id="confirm" type="password" autoComplete="new-password" {...register('confirm')} />
                    <FieldError errors={[errors.confirm]} />
                  </Field>
                  {errors.root ? (
                    <Alert variant="destructive">
                      <AlertDescription>{errors.root.message}</AlertDescription>
                    </Alert>
                  ) : null}
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
                    {isSubmitting ? 'Resetting…' : 'Reset password'}
                  </Button>
                </FieldGroup>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
