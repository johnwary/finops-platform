import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LoginForm } from '@/components/login-form';
import { useSession } from '../hooks/useSession';

export function LoginPage() {
  const { data, isPending } = useSession();

  if (isPending) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
        <div className="w-full max-w-sm md:max-w-4xl">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-44" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (data) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <LoginForm />
      </div>
    </main>
  );
}
