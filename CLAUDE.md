# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repo.

# FinOps Platform — Claude Guide

## Commands

```bash
# Root (runs both apps concurrently)
pnpm dev
pnpm build
pnpm lint

# API (from apps/api/ or via filter)
pnpm --filter api dev          # tsx watch
pnpm --filter api test         # vitest
pnpm --filter api test -- --run src/features/loans/loans.service.test.ts  # single test file
pnpm --filter api prisma:migrate   # prisma migrate dev
pnpm --filter api prisma:generate  # regenerate Prisma client
pnpm --filter api prisma:seed      # seed DB with fake data

# Web (from apps/web/ or via filter)
pnpm --filter web dev          # vite
pnpm --filter web build        # tsc -b && vite build
pnpm --filter web lint         # eslint
```

## Monorepo Structure

```
finops-platform/
├── apps/
│   ├── api/          # Express + Prisma backend (@finops/api)
│   └── web/          # Vite + React frontend (@finops/web)
├── packages/
│   └── types/        # Shared TypeScript types (@finops/types) — planned
├── package.json      # pnpm workspace root
└── pnpm-workspace.yaml
```

Root `pnpm dev` runs both apps.

## Tech Stack

**API:** Express 5, Prisma 7, PostgreSQL, better-auth, Zod, Pino, Vitest  
**Web:** Vite, React 19, TypeScript, Tailwind 4, shadcn, React Query, Zustand, React Hook Form, Zod, Sonner  
**Shared:** `@finops/types` (Prisma-derived types, shared to web via workspace import) — planned, not yet built

## Roles

Three roles: `admin`, `manager`, `user`. Stored on `User.role`. Backend enforces (middleware), frontend gates UI.

## API Conventions

### Versioning
All routes prefixed `/api/v1/`.

### Error Response Shape
```json
{ "error": { "code": "SNAKE_CASE_CODE", "message": "Human readable", "status": 404 } }
```
`code` = machine-readable (frontend switches on it). Use central error factory — never inline.

### Success Response Shape
```json
// Single resource
{ "data": { ... } }

// List with cursor pagination
{ "data": [ ... ], "meta": { "nextCursor": "<id>", "hasMore": true, "limit": 20 } }
```
Always wrap responses. No raw arrays or objects at top level.

### Route Structure
```
apps/api/src/
├── index.ts               # Express app entry, middleware stack
├── lib/
│   ├── auth.ts            # better-auth instance
│   ├── logger.ts          # Pino logger
│   ├── prisma.ts          # Prisma client singleton
│   └── response.ts        # success() and error() response helpers
├── middleware/
│   ├── auth.middleware.ts  # Session verification, attach req.user
│   └── rbac.middleware.ts  # Role enforcement (requireRole)
└── features/
    ├── loans/
    │   ├── loans.router.ts
    │   ├── loans.controller.ts
    │   ├── loans.service.ts
    │   └── loans.schema.ts   # Zod validation schemas
    ├── borrowers/
    ├── deposits/
    └── ...
```

### RBAC Middleware
```ts
// Usage in router
router.get('/admin-only', requireRole('admin'), handler)
router.get('/admin-or-manager', requireRole(['admin', 'manager']), handler)
```

### Thin Controllers, Fat Services
Controllers: parse request → call service → send response. No business logic.  
Services: all business logic, DB queries, transactions, domain rules.

### Route-Level Validation
Zod runs as middleware before controller. Controller receives clean data via `req.validatedBody`.
```ts
router.post('/', validate(createLoanSchema), loansController.create)
```

### Transactions
Any write touching >1 table use `prisma.$transaction`. No partial state.

### Soft Deletes
No hard deletes. All deletable models have `deletedAt: DateTime?`. All queries filter `{ deletedAt: null }`.  
Financial records (`LoanPayment`, `CapitalEntry`, `DepositPayout`) immutable — never deleted.

### State Transitions
Model financial state changes as action endpoints, not PATCH:
```
POST /api/v1/loans/:id/approve
POST /api/v1/loans/:id/disburse
POST /api/v1/loans/:id/payments
```

### Pagination — Cursor-Based
All list endpoints use cursor pagination.
```
GET /api/v1/loans?cursor=<id>&limit=20
// meta: { nextCursor, hasMore, limit }
```

### Audit Trail
All state-changing operations write to `ActivityLog` inside same transaction as main write.

### Testing
Unit test services only. Test DB: SQLite in-memory (Prisma datasource override). No mocking Prisma.

## Frontend Conventions

### Folder Structure
Feature-based. All code for domain lives in feature folder.

```
apps/web/src/
├── features/
│   ├── auth/
│   │   ├── components/    # Login, Signup forms
│   │   ├── hooks/         # useSession, useLogin, useLogout
│   │   ├── schemas.ts     # Zod schemas for forms
│   │   └── types.ts
│   ├── loans/
│   ├── borrowers/
│   ├── deposits/
│   └── ...
├── components/
│   ├── ui/                # shadcn components
│   └── layout/            # AppShell, Sidebar, TopBar
├── lib/
│   ├── auth-client.ts     # better-auth client instance
│   ├── api.ts             # Base fetch client (wraps fetch, handles errors)
│   └── utils.ts           # cn() and misc utils
├── hooks/                 # Truly global hooks only (useDebounce, etc.)
├── store/                 # Zustand stores (global UI state only)
└── router.tsx             # React Router route definitions
```

### React Query Hooks
Colocated in feature folder (`features/loans/hooks/`). Not centralized.  
One hook per query/mutation. Name pattern: `useLoans`, `useLoan`, `useCreateLoan`.

### Zod Schemas
Separate `schemas.ts` per feature. Forms and API request validation share same schema.

### Route Guards
```tsx
<ProtectedRoute>           // redirects to /login if no session
<RequireRole role="admin"> // hides/redirects if wrong role
```

### UI Role Gating
Use `<RequireRole>` to conditionally render. Never rely solely on frontend gating — backend authoritative.

### Component Rules
- Max ~200 lines soft limit
- Props interface: `[ComponentName]Props`
- Boolean props: `is`/`has`/`can` prefix (`isLoading`, `hasError`)
- Event handlers: `handle` prefix (`handleSubmit`, `handleDelete`)
- No `useEffect` for data fetching — use React Query
- Absolute imports via `@/` only

### Forms
React Hook Form + Zod. Schemas in `features/[name]/schemas.ts` shared between form validation and API types.  
Validation errors inline. Success/fail via Sonner toast.

### Data Fetching
Server state = React Query only. Zustand never holds server data.  
Default `staleTime`: 3 min. Override per query to reduce VPS traffic.

### Locale & Formatting
- Currency: Philippine Peso `₱`, 2 decimal places, `en-PH` locale
- Timezone: `Asia/Manila` fixed — no user locale detection
- Dates: `date-fns` with `Asia/Manila` offset

## Shared Types (`packages/types`)

Prisma-generated types flow into `@finops/types`, imported by web.  
No type duplication between API and web. No codegen — manual re-export from Prisma types.

## Commits

Conventional Commits with scopes:
```
feat(loans): add installment calculation
fix(auth): correct session expiry check
chore(api): add Prisma migration for borrower KYC
refactor(web): extract loan form into feature folder
```

Scopes: `auth`, `loans`, `borrowers`, `deposits`, `api`, `web`, `types`, `db`

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->
