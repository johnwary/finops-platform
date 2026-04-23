import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { inviteAcceptSchema, type InviteAcceptInput } from '../schemas'
import { useAcceptInvite } from '../hooks/useAcceptInvite'
import { useValidateInviteToken } from '../hooks/useValidateInviteToken'

export function InviteAcceptPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const invite = useValidateInviteToken(token)
  const acceptInvite = useAcceptInvite()
  const expiresAt = useMemo(
    () => (invite.data ? new Date(invite.data.expiresAt).toLocaleString() : ''),
    [invite.data],
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteAcceptInput>({
    resolver: zodResolver(inviteAcceptSchema),
    defaultValues: {
      name: '',
      password: '',
      passwordConfirm: '',
    },
  })

  if (!token) {
    return <InviteState title="Invalid invitation" message="The invitation link is missing a token." />
  }

  if (invite.isPending) {
    return <InviteLoadingState />
  }

  if (invite.isError || !invite.data) {
    return <InviteState title="Invalid invitation" message="This invitation is expired, revoked, or unavailable." />
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Badge variant="secondary">Invitation</Badge>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>{invite.data.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field orientation="horizontal">
              <FieldLabel>Role</FieldLabel>
              <Badge variant="outline">{invite.data.role}</Badge>
            </Field>
            <Field>
              <FieldDescription>Expires {expiresAt}</FieldDescription>
            </Field>
            <Separator />
          </FieldGroup>

          <form
            className="mt-4"
            onSubmit={handleSubmit((values) =>
              acceptInvite.mutate({
                ...values,
                token,
              }),
            )}
          >
            <FieldGroup>
              <Field data-disabled>
                <FieldLabel htmlFor="invite-email">Email</FieldLabel>
                <Input id="invite-email" value={invite.data.email} disabled />
              </Field>

              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register('name')} />
                <FieldError errors={[errors.name]} />
              </Field>

              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="new-password">Password</FieldLabel>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
                <FieldError errors={[errors.password]} />
              </Field>

              <Field data-invalid={!!errors.passwordConfirm}>
                <FieldLabel htmlFor="password-confirm">Confirm password</FieldLabel>
                <Input
                  id="password-confirm"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.passwordConfirm}
                  {...register('passwordConfirm')}
                />
                <FieldError errors={[errors.passwordConfirm]} />
              </Field>

              {acceptInvite.error ? (
                <Alert variant="destructive">
                  <AlertDescription>{acceptInvite.error.message}</AlertDescription>
                </Alert>
              ) : null}

              <Button type="submit" size="lg" disabled={acceptInvite.isPending}>
                {acceptInvite.isPending ? <Spinner data-icon="inline-start" /> : null}
                {acceptInvite.isPending ? 'Creating account...' : 'Accept invitation'}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

function InviteState({ title, message }: { title: string; message: string }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Badge variant="secondary">Invitation</Badge>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
      </Card>
    </main>
  )
}

function InviteLoadingState() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </FieldGroup>
        </CardContent>
      </Card>
    </main>
  )
}
