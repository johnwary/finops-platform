# Auth Flow

# Date: April 25, 2026

## Invite Flow (new user)

1. Admin hits `POST /api/v1/invitations` → creates `Invitation` row + writes `Verification` staging marker → Resend sends invite email
2. User clicks link → `/invite/accept?token=<token>`
3. Frontend calls `POST /api/v1/invitations/validate` with token → verifies `Invitation` is PENDING + not expired → upserts `Verification` marker (10 min TTL) → returns `{ email, role, expiresAt }`
4. User fills name + password → submits
5. Frontend calls `POST /api/v1/invitations/validate` again (inside `useAcceptInvite`) to re-stage, then calls `authClient.signUp.email`
6. better-auth `user.create.before` hook fires → finds `Verification` marker → extracts role → deletes marker → injects role onto user
7. better-auth creates `User` row with correct role
8. better-auth `user.create.after` hook fires → marks `Invitation` as ACCEPTED → sends welcome email
9. `autoSignIn: true` → session created → redirected to `/dashboard`

## Login Flow (returning user)

1. User hits `/login`, submits email + password
2. Frontend calls `authClient.signIn.email`
3. better-auth validates credentials → creates session cookie
4. `onSuccess` → navigate to `/dashboard`

## Session / Route Guard

- `ProtectedRoute` calls `useSession` → `authClient.useSession()` → polls better-auth `/api/auth/get-session`
- No session → redirect to `/login`
- Session present → render children

## Logout

1. `useLogout` calls `authClient.signOut` → better-auth invalidates session cookie
2. `queryClient.clear()` → navigate to `/login`
