# Web — Claude Guide

## Stack

Vite, React 19, TypeScript, Tailwind 4, shadcn/ui, React Query, Zustand, React Hook Form, Zod, Sonner

## Folder Structure

```
apps/web/src/
├── features/
│   ├── auth/
│   │   ├── components/    # LoginForm, SignupForm
│   │   ├── hooks/         # useSession, useLogin, useLogout
│   │   ├── schemas.ts     # Zod schemas
│   │   └── types.ts
│   ├── loans/
│   ├── borrowers/
│   ├── deposits/
│   └── ...
├── components/
│   ├── ui/                # shadcn components only
│   └── layout/            # AppShell, Sidebar, TopBar, ErrorBoundary
├── lib/
│   ├── auth-client.ts     # better-auth client instance
│   ├── api.ts             # Base fetch client — handles errors, wraps fetch
│   └── utils.ts           # cn() only
├── hooks/                 # Global hooks only (useDebounce, useMediaQuery)
├── store/                 # Zustand — global UI state only (sidebar, theme)
└── router.tsx             # All route definitions
```

## Routing

Nested URLs. Unauthenticated → `/login`. Post-login → redirect to last visited page.

```
/login
/signup
/dashboard
/dashboard/loans
/dashboard/loans/:id
/dashboard/borrowers
/dashboard/borrowers/:id
/dashboard/deposits
/dashboard/deposits/:id
/dashboard/reports
/dashboard/settings        # admin only
```

## Route Guards

```tsx
<ProtectedRoute />         // redirect to /login if no session
<RequireRole role="admin"> // redirect if wrong role
```

Frontend role gates are UX only. Backend is authoritative.

## Layout

Collapsible sidebar + top bar + content area. Use shadcn `SidebarProvider`.  
Mobile supported via responsive Tailwind classes.  
Light + dark mode via CSS variables (already in `index.css`).

## Component Rules

- Max ~200 lines soft limit — split if significantly over
- Props interface named `[ComponentName]Props`
- Boolean props: `is`/`has`/`can` prefix — `isLoading`, `hasError`, `canApprove`
- Event handlers: `handle` prefix — `handleSubmit`, `handleDelete`
- No direct DOM manipulation
- No `useEffect` for data fetching — use React Query
- Custom hooks: `use` prefix always
- Absolute imports only via `@/` — no `../../`

## Forms

All forms: React Hook Form + Zod. No `useState` per field, no uncontrolled inputs.  
Zod schemas in `features/[name]/schemas.ts` — shared between form validation and API types.  
Validation errors shown inline. Action feedback (success/fail) via Sonner toast.

## Data Fetching (React Query)

Server state = React Query only. Zustand never holds server data.

Default `staleTime`:
- Lists (loans, borrowers, deposits): 3 min
- Financial totals / reports: 10 min
- Override per query as needed to reduce VPS traffic

Hook naming: `useLoans`, `useLoan`, `useCreateLoan`, `useUpdateLoan`  
Colocated in `features/[name]/hooks/`

## State (Zustand)

Global UI state only: sidebar open/close, theme preference.  
No server data in Zustand stores.

## Locale & Formatting

- Currency: Philippine Peso `₱`, 2 decimal places, `en-PH` locale
- Timezone: `Asia/Manila` fixed — no user locale detection
- Dates: display using `date-fns` with `Asia/Manila` offset

## Coding Principles

- **YAGNI** — don't build what isn't needed now
- **Guard clauses** — return early, avoid nested if/else
- **Single responsibility** — one file, one purpose
- **No `any`** — use `unknown` and narrow, or define proper types
- **Explicit return types** on exported functions only
- **`async/await` only** — no `.then()` chains
- **No magic numbers** — extract to named constants
- **No premature optimization** — `useMemo`/`useCallback`/`React.memo` only when profiler shows real problem
- **No `aria-*` overrides** on shadcn components without reason

## Security

- Sessions via httpOnly cookies (better-auth) — never localStorage
- Never trust frontend role state as sole gate — backend enforces
