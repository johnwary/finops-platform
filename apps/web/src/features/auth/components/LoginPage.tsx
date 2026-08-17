import { Navigate } from 'react-router-dom'
import heroUrl from '../assets/login-image.jpg'
import { FieldDescription } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { DemoBanner } from '@/components/layout/DemoBanner'
import { LoginForm } from './LoginForm'
import { useSession } from '../hooks/useSession'

export function LoginPage() {
  const { data, isPending } = useSession()

  if (data) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex min-h-svh flex-col">
      <DemoBanner />
      <main className="grid flex-1 lg:grid-cols-2">
        <div className="flex flex-col p-6 md:p-10">
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-sm">
              {isPending ? (
                <div className="flex flex-col gap-4">
                  <Skeleton className="mx-auto mb-2 h-8 w-44" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <LoginForm />
              )}
            </div>
          </div>
          <FieldDescription className="text-center">
            By continuing, you agree to use Lending Management System according to your
            organization&apos;s access policies.
          </FieldDescription>
        </div>
        <div className="relative hidden bg-muted lg:block">
          <img
            src={heroUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.25] dark:grayscale"
          />
          <div className="absolute inset-0 bg-linear-to-br from-primary/55 via-accent/35 to-background/20 mix-blend-multiply dark:from-background/75 dark:via-primary/35 dark:to-accent/20 dark:mix-blend-normal" />
        </div>
      </main>
    </div>
  )
}
