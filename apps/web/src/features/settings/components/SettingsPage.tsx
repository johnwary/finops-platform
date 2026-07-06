import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { authClient } from '@/lib/auth-client';
import { isRole, type Role } from '@/lib/auth-client';
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
import { useActivityLogs } from '@/features/activity/hooks/useActivityLogs';
import {
  createInvitationSchema,
  type CreateInvitationInput,
} from '@/features/invitations/schemas';
import { useSession } from '@/features/auth/hooks/useSession';
import { useCompanyProfile, useUpdateCompanyProfile } from '@/features/company/hooks/useCompanyProfile';
import type { CompanyProfile } from '@/features/company/types';
import { BusinessFundsSection } from '@/features/funds/components/BusinessFundsSection';

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
          Manage team members, invitations, and audit logs.
        </p>
      </div>
      <Separator />
      <CompanyProfileSection />
      <BusinessFundsSection />
      <InviteUserSection />
      <InvitationsTable />
      <UsersTable />
      <AuditLogsTable />
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

function AuditLogsTable() {
  const activityLogs = useActivityLogs();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Logs</CardTitle>
        <CardDescription>System and user audit events.</CardDescription>
      </CardHeader>
      <CardContent>
        <AuditLogsTableContent activityLogs={activityLogs} />
      </CardContent>
    </Card>
  );
}

function metadataSummary(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object') return '—';
  const text = JSON.stringify(metadata);
  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}

function AuditLogsTableContent({ activityLogs }: { activityLogs: ReturnType<typeof useActivityLogs> }) {
  if (activityLogs.isPending) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (activityLogs.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load audit logs.</AlertDescription>
      </Alert>
    );
  }

  const logs = activityLogs.data?.pages.flatMap((page) => page.data) ?? [];

  if (!logs.length) {
    return <p className="text-sm text-muted-foreground">No audit logs yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Metadata</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="text-muted-foreground">
                {new Date(log.createdAt).toLocaleString('en-PH')}
              </TableCell>
              <TableCell>
                {log.user ? (
                  <div className="min-w-0">
                    <p className="font-medium truncate">{log.user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{log.user.email}</p>
                  </div>
                ) : (
                  <Badge variant="outline">{log.actorType}</Badge>
                )}
              </TableCell>
              <TableCell className="font-medium">{log.action}</TableCell>
              <TableCell className="text-muted-foreground max-w-32 truncate">
                {log.targetId ?? '—'}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-sm truncate">
                {metadataSummary(log.metadata)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {activityLogs.hasNextPage ? (
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={activityLogs.isFetchingNextPage}
          onClick={() => activityLogs.fetchNextPage()}
        >
          {activityLogs.isFetchingNextPage ? (
            <Spinner data-icon="inline-start" />
          ) : null}
          {activityLogs.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      ) : null}
    </div>
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

type BetterAuthUser = {
  id: string
  name: string
  email: string
  role?: string | null
  banned?: boolean | null
  createdAt: Date
}

function useUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const result = await authClient.admin.listUsers({ query: { limit: 100 } })
      if (result.error) throw new Error(result.error.message ?? 'Failed to load users.')
      return (result.data?.users ?? []) as BetterAuthUser[]
    },
    staleTime: 1000 * 60,
  })
}

function UsersTable() {
  const users = useUsers()
  const session = useSession()
  const queryClient = useQueryClient()

  const setRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      // better-auth's type only lists built-in roles; cast to allow custom 'manager' role
      authClient.admin.setRole({ userId, role: role as 'user' | 'admin' }),
    onSuccess: () => {
      toast.success('Role updated.')
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: () => toast.error('Failed to update role.'),
  })

  const ban = useMutation({
    mutationFn: (userId: string) => authClient.admin.banUser({ userId }),
    onSuccess: () => {
      toast.success('User suspended.')
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: () => toast.error('Failed to suspend user.'),
  })

  const unban = useMutation({
    mutationFn: (userId: string) => authClient.admin.unbanUser({ userId }),
    onSuccess: () => {
      toast.success('User reactivated.')
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: () => toast.error('Failed to reactivate user.'),
  })

  const currentUserId = session.data?.user?.id

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
        <CardDescription>Active user accounts. Change roles or suspend access.</CardDescription>
      </CardHeader>
      <CardContent>
        {users.isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : users.isError ? (
          <Alert variant="destructive">
            <AlertDescription>Failed to load users.</AlertDescription>
          </Alert>
        ) : !users.data?.length ? (
          <p className="text-sm text-muted-foreground">No users yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.data.map((user) => {
                const isSelf = user.id === currentUserId
                const isBusy = setRole.isPending || ban.isPending || unban.isPending
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Select
                        value={user.role ?? 'user'}
                        disabled={isSelf || isBusy}
                        onValueChange={(role) =>
                          isRole(role)
                            ? setRole.mutate({ userId: user.id, role })
                            : toast.error('Failed to update role.')
                        }
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {user.banned ? (
                        <Badge variant="destructive">Suspended</Badge>
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString('en-PH')}
                    </TableCell>
                    <TableCell className="text-right">
                      {!isSelf && (
                        user.banned ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => unban.mutate(user.id)}
                          >
                            Reactivate
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => ban.mutate(user.id)}
                          >
                            Suspend
                          </Button>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

const companyProfileSchema = z.object({
  name: z.string().trim().min(1, { message: 'Company name required' }).max(200),
  address: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(50).optional(),
  email: z.string().trim().email({ message: 'Enter a valid email' }).max(200).optional().or(z.literal('')),
  website: z.string().trim().max(200).optional(),
  taxId: z.string().trim().max(100).optional(),
})

type CompanyProfileFormInput = z.infer<typeof companyProfileSchema>

function CompanyProfileSection() {
  const { data: profile, isPending } = useCompanyProfile()
  const update = useUpdateCompanyProfile()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CompanyProfileFormInput>({
    resolver: zodResolver(companyProfileSchema),
    values: profile
      ? {
          name: profile.name,
          address: profile.address ?? '',
          phone: profile.phone ?? '',
          email: profile.email ?? '',
          website: profile.website ?? '',
          taxId: profile.taxId ?? '',
        }
      : undefined,
  })

  function handleSave(values: CompanyProfileFormInput) {
    update.mutate(values as Partial<CompanyProfile>, { onSuccess: () => reset(values) })
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Company Profile</CardTitle>
        <CardDescription>
          Your organization details. Leave blank fields to omit them.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit(handleSave)}>
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="cp-name">Company Name</FieldLabel>
                <Input id="cp-name" {...register('name')} placeholder="Acme Lending Corp." />
                <FieldError errors={[errors.name]} />
              </Field>
              <Field data-invalid={!!errors.address}>
                <FieldLabel htmlFor="cp-address">Address</FieldLabel>
                <Input id="cp-address" {...register('address')} placeholder="123 Main St, City" />
                <FieldError errors={[errors.address]} />
              </Field>
              <Field data-invalid={!!errors.phone}>
                <FieldLabel htmlFor="cp-phone">Phone</FieldLabel>
                <Input id="cp-phone" {...register('phone')} placeholder="+63 912 345 6789" />
                <FieldError errors={[errors.phone]} />
              </Field>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="cp-email">Email</FieldLabel>
                <Input id="cp-email" type="email" {...register('email')} placeholder="info@company.com" />
                <FieldError errors={[errors.email]} />
              </Field>
              <Field data-invalid={!!errors.website}>
                <FieldLabel htmlFor="cp-website">Website</FieldLabel>
                <Input id="cp-website" {...register('website')} placeholder="https://company.com" />
                <FieldError errors={[errors.website]} />
              </Field>
              <Field data-invalid={!!errors.taxId}>
                <FieldLabel htmlFor="cp-taxid">TIN / Tax ID</FieldLabel>
                <Input id="cp-taxid" {...register('taxId')} placeholder="123-456-789-000" />
                <FieldError errors={[errors.taxId]} />
              </Field>
              {update.error ? (
                <Alert variant="destructive">
                  <AlertDescription>{update.error.message}</AlertDescription>
                </Alert>
              ) : null}
              <Button type="submit" disabled={update.isPending || !isDirty} className="w-fit">
                {update.isPending ? <Spinner data-icon="inline-start" /> : null}
                {update.isPending ? 'Saving…' : 'Save Profile'}
              </Button>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
