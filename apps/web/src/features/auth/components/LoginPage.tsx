import { Navigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { LoginForm } from './LoginForm'
import { useSession } from '../hooks/useSession'

export function LoginPage() {
  const { data, isPending } = useSession()

  if (isPending) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-8 w-36" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </main>
    )
  }

  if (data) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Badge variant="secondary">FinOps Platform</Badge>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Use your invited account to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  )
}
