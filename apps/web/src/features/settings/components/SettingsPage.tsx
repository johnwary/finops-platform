import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCreateInvitation } from '@/features/invitations/hooks/useCreateInvitation';
import { useInvitations } from '@/features/invitations/hooks/useInvitations';
import { useRevokeInvitation } from '@/features/invitations/hooks/useRevokeInvitation';
import {
  createInvitationSchema,
  type CreateInvitationInput,
} from '@/features/invitations/schemas';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  user: 'User',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  REVOKED: 'Revoked',
  EXPIRED: 'Expired',
};

const STATUS_VARIANTS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  PENDING: 'secondary',
  ACCEPTED: 'default',
  REVOKED: 'destructive',
  EXPIRED: 'outline',
};

export function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage team members and invitations.
        </p>
      </div>
      <Separator />
      <InviteUserSection />
      <InvitationsTable />
    </div>
  );
}

function InviteUserSection() {
  const createInvitation = useCreateInvitation();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateInvitationInput>({
    resolver: zodResolver(createInvitationSchema),
    defaultValues: { email: '', role: 'user' },
  });

  const role = useWatch({ control, name: 'role' });

  function handleInvite(values: CreateInvitationInput) {
    createInvitation.mutate(values, {
      onSuccess: () => reset(),
    });
  }

  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Invite team member</CardTitle>
        <CardDescription>
          Send an invitation link via email. Expires in 7 days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleInvite)}>
          <FieldGroup>
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="invite-email">Email address</FieldLabel>
              <Input
                id="invite-email"
                type="email"
                autoComplete="off"
                placeholder="colleague@example.com"
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              <FieldError errors={[errors.email]} />
            </Field>

            <Field data-invalid={!!errors.role}>
              <FieldLabel htmlFor="invite-role">Role</FieldLabel>
              <Select
                value={role}
                onValueChange={(val) =>
                  setValue('role', val as CreateInvitationInput['role'], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="invite-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <FieldError errors={[errors.role]} />
            </Field>

            {createInvitation.error ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {createInvitation.error.message}
                </AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" disabled={createInvitation.isPending}>
              {createInvitation.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : null}
              {createInvitation.isPending ? 'Sending...' : 'Send invitation'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function InvitationsTable() {
  const invitations = useInvitations();
  const revokeInvitation = useRevokeInvitation();

  function handleRevoke(id: string, email: string) {
    revokeInvitation.mutate(id, {
      onSuccess: () => toast.success(`Invitation for ${email} revoked.`),
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invitations</CardTitle>
        <CardDescription>
          All sent invitations and their current status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <InvitationsTableContent
          invitations={invitations}
          revokeIsPending={revokeInvitation.isPending}
          onRevoke={handleRevoke}
        />
      </CardContent>
    </Card>
  );
}

interface InvitationsTableContentProps {
  invitations: ReturnType<typeof useInvitations>
  revokeIsPending: boolean
  onRevoke: (id: string, email: string) => void
}

function InvitationsTableContent({ invitations, revokeIsPending, onRevoke }: InvitationsTableContentProps) {
  if (invitations.isPending) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (invitations.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load invitations.</AlertDescription>
      </Alert>
    );
  }

  if (!invitations.data?.data?.length) {
    return <p className="text-sm text-muted-foreground">No invitations yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Invited by</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitations.data.data.map((inv) => (
          <TableRow key={inv.id}>
            <TableCell className="font-medium">{inv.email}</TableCell>
            <TableCell>{ROLE_LABELS[inv.role] ?? inv.role}</TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANTS[inv.status] ?? 'outline'}>
                {STATUS_LABELS[inv.status] ?? inv.status}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {inv.invitedBy.name}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(inv.expiresAt).toLocaleDateString('en-PH')}
            </TableCell>
            <TableCell className="text-right">
              {inv.status === 'PENDING' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={revokeIsPending}
                  onClick={() => onRevoke(inv.id, inv.email)}
                >
                  Revoke
                </Button>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
