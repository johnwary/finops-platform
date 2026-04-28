import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SettingsPage() {
  return (
    <Card className="min-h-[100vh] flex-1 md:min-h-min">
      <CardHeader>
        <Badge variant="secondary">Admin</Badge>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Admin-only settings route.</CardDescription>
      </CardHeader>
      <CardContent>
        <Badge variant="outline">Protected by role</Badge>
      </CardContent>
    </Card>
  )
}
