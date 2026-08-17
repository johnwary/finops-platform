import { Navigate, Outlet } from 'react-router-dom'
import { Spinner } from '@/components/ui/spinner'
import { useSession } from '../hooks/useSession'

export function ProtectedRoute() {
  const { data, isPending } = useSession()

  // Matches the router's Suspense fallback: session resolution follows chunk
  // loading, so reusing it reads as one continuous wait rather than two states.
  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
