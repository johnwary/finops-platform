import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useLogout } from '../auth/hooks/useLogout'

export function DashboardPage() {
  const logout = useLogout()

  return (
    <main className="flex min-h-svh items-start justify-center bg-background p-6 pt-24">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <Badge variant="secondary">FinOps Platform</Badge>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>Authentication is active. Invite-only access and role checks are enforced.</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="outline">RBAC enabled</Badge>
        </CardContent>
        <CardFooter>
          <Button type="button" variant="outline" onClick={() => logout.mutate()} disabled={logout.isPending}>
            {logout.isPending ? <Spinner data-icon="inline-start" /> : null}
            {logout.isPending ? 'Signing out...' : 'Sign out'}
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
