import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SettingsPage() {
  return (
    <main className="flex min-h-svh items-start justify-center bg-background p-6 pt-24">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <Badge variant="secondary">Admin</Badge>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Admin-only settings route.</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="outline">Protected by role</Badge>
        </CardContent>
      </Card>
    </main>
  )
}
