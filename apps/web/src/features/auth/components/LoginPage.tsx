import { Navigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { FieldDescription } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { LoginForm } from './LoginForm'
import { useSession } from '../hooks/useSession'

export function LoginPage() {
  const { data, isPending } = useSession()

  if (isPending) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6 md:max-w-3xl">
          <Card className="overflow-hidden p-0">
            <CardContent className="grid p-0 md:grid-cols-2">
              <div className="p-6 md:p-8">
                <Skeleton className="mb-6 h-8 w-44 mx-auto" />
                <div className="flex flex-col gap-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <Skeleton className="hidden md:block rounded-none" />
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  if (data) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6 md:max-w-3xl">
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            <LoginForm />
          </CardContent>
        </Card>
        <FieldDescription className="px-6 text-center">
          By continuing, you agree to use FinOps Platform according to your
          organization&apos;s access policies.
        </FieldDescription>
      </div>
    </main>
  )
}
