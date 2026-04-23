import { Navigate, Outlet } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '../hooks/useSession'

export function ProtectedRoute() {
  const { data, isPending } = useSession()

  if (isPending) {
    return (
      <main className="flex min-h-svh items-start justify-center bg-background p-6 pt-24">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </main>
    )
  }

  if (!data) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
