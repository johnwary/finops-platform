import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export function DashboardPage() {
  return (
    <>
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <Card className="aspect-video">
          <CardHeader>
            <CardDescription>Total portfolio</CardDescription>
            <CardTitle>$2.4M</CardTitle>
          </CardHeader>
        </Card>
        <Card className="aspect-video">
          <CardHeader>
            <CardDescription>Active borrowers</CardDescription>
            <CardTitle>184</CardTitle>
          </CardHeader>
        </Card>
        <Card className="aspect-video">
          <CardHeader>
            <CardDescription>Monthly collections</CardDescription>
            <CardTitle>$148K</CardTitle>
          </CardHeader>
        </Card>
      </div>
      <Card className="min-h-[100vh] flex-1 md:min-h-min">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>
            Authentication is active. Invite-only access and role checks are enforced.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            Portfolio activity will appear here.
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          RBAC enabled
        </CardFooter>
      </Card>
    </>
  )
}
