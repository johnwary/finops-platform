import { useState } from 'react'
import { Link } from 'react-router-dom'
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

const schema = z.object({ email: z.string().email({ message: 'Enter a valid email address' }) })
type Input = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<Input>({
    resolver: zodResolver(schema),
  })

  async function handleRequest(values: Input) {
    const result = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (result.error) {
      setError('email', { message: result.error.message ?? 'Request failed.' })
      return
    }
    setSent(true)
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted p-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <Card>
          <CardContent className="p-6 md:p-8">
            {sent ? (
              <div className="flex flex-col gap-4 text-center">
                <h1 className="text-xl font-bold">Check your email</h1>
                <p className="text-sm text-muted-foreground">
                  If that email is registered, a reset link has been sent. Check your inbox.
                </p>
                <Button asChild variant="outline">
                  <Link to="/login">Back to log in</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(handleRequest)}>
                <FieldGroup>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold">Forgot password?</h1>
                    <p className="text-sm text-muted-foreground">
                      Enter your email and we'll send you a reset link.
                    </p>
                  </div>
                  <Field data-invalid={!!errors.email}>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input id="email" type="email" autoComplete="email" {...register('email')} />
                    <FieldError errors={[errors.email]} />
                  </Field>
                  {errors.root ? (
                    <Alert variant="destructive">
                      <AlertDescription>{errors.root.message}</AlertDescription>
                    </Alert>
                  ) : null}
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
                    {isSubmitting ? 'Sending…' : 'Send reset link'}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    <Link to="/login" className="underline underline-offset-4">Back to log in</Link>
                  </p>
                </FieldGroup>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
