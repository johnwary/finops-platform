# Web — Claude Guide

## Stack

Vite, React 19, TypeScript, Tailwind 4, shadcn/ui, React Query, Zustand, React Hook Form, Zod, Sonner

## Folder Structure

```
apps/web/src/
├── features/
│   ├── auth/
│   │   ├── components/    # LoginPage, LoginForm, InviteAcceptPage, ProtectedRoute, RequireRole
│   │   ├── hooks/         # useSession, useLogin, useLogout, useAcceptInvite, useValidateInviteToken
│   │   └── schemas.ts     # loginSchema, inviteAcceptSchema
│   ├── invitations/
│   │   ├── hooks/         # useInvitations, useCreateInvitation, useRevokeInvitation
│   │   ├── schemas.ts
│   │   └── types.ts
│   ├── settings/          # SettingsPage (admin only — invitation management)
│   ├── dashboard/         # DashboardPage
│   ├── borrowers/         # TODO
│   ├── loans/             # TODO
│   └── deposits/          # TODO
├── components/
│   ├── ui/                # shadcn components only
│   └── layout/            # AppShell, AppSidebar, NavMain, NavUser, nav-config.ts
├── lib/
│   ├── auth-client.ts     # better-auth client + exports Session, Role types
│   ├── api.ts             # apiFetch<T>, apiFetchList<T>, ApiError class
│   └── utils.ts           # cn() only
├── hooks/                 # Global hooks only (use-mobile.ts)
└── router.tsx             # All route definitions
```

## Routing

Nested URLs. Unauthenticated → `/login`. Post-login → `/dashboard`.

```
/login
/invite/accept             # public — invite token acceptance
/dashboard
/dashboard/settings        # admin only (RequireRole)
/dashboard/borrowers       # TODO
/dashboard/loans           # TODO
/dashboard/deposits        # TODO
/dashboard/reports         # TODO
```

## Route Guards

```tsx
<ProtectedRoute />         // redirect to /login if no session
<RequireRole role="admin"> // redirect if wrong role
```

Frontend role gates = UX only. Backend authoritative.

## Layout

Collapsible sidebar + top bar + content area. Use shadcn `SidebarProvider`.
Mobile via responsive Tailwind classes.
Light + dark mode via CSS variables (in `index.css`).

## Component Rules

- Max ~200 lines soft limit — split if over
- Props interface named `[ComponentName]Props`
- Boolean props: `is`/`has`/`can` prefix — `isLoading`, `hasError`, `canApprove`
- Event handlers: `handle` prefix — `handleSubmit`, `handleDelete`
- No direct DOM manipulation
- No `useEffect` for data fetching — use React Query
- Custom hooks: `use` prefix always
- Absolute imports via `@/` only — no `../../`

## Forms

All forms: React Hook Form + Zod. No `useState` per field, no uncontrolled inputs.
Zod schemas in `features/[name]/schemas.ts` — shared between form validation + API types.
Validation errors inline. Action feedback via Sonner toast.

## Data Fetching (React Query)

Server state = React Query only. Zustand never holds server data.

Default `staleTime`:
- Lists (loans, borrowers, deposits): 3 min
- Financial totals / reports: 10 min
- Override per query to reduce VPS traffic

Hook naming: `useLoans`, `useLoan`, `useCreateLoan`, `useUpdateLoan`
Colocated in `features/[name]/hooks/`

## State (Zustand)

Global UI state only: sidebar open/close, theme preference.
No server data in Zustand stores.

## Locale & Formatting

- Currency: Philippine Peso `₱`, 2 decimal places, `en-PH` locale
- Timezone: `Asia/Manila` fixed — no user locale detection
- Dates: `date-fns` with `Asia/Manila` offset

## Coding Principles

- **YAGNI** — don't build what isn't needed now
- **Guard clauses** — return early, avoid nested if/else
- **Single responsibility** — one file, one purpose
- **No `any`** — use `unknown` + narrow, or define proper types
- **Explicit return types** on exported functions only
- **`async/await` only** — no `.then()` chains
- **No magic numbers** — extract to named constants
- **No premature optimization** — `useMemo`/`useCallback`/`React.memo` only when profiler shows real problem
- **No `aria-*` overrides** on shadcn components without reason

## Security

- Sessions via httpOnly cookies (better-auth) — never localStorage
- Never trust frontend role state as sole gate — backend enforces