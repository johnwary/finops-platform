# API — Claude Guide

## Stack

Express 5, Prisma 7, PostgreSQL, better-auth, Zod, Pino, Resend, Vitest

## Folder Structure

```
apps/api/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts              # Realistic fake data (borrowers, loans, users)
├── src/
│   ├── index.ts             # App entry — middleware stack, route mounting, graceful shutdown
│   ├── lib/
│   │   ├── auth.ts          # better-auth instance (email/password only)
│   │   ├── env.ts           # Zod-validated env — single source of env truth
│   │   ├── prisma.ts        # Prisma client singleton
│   │   ├── logger.ts        # Pino logger
│   │   ├── resend.ts        # Resend client singleton
│   │   └── response.ts      # success() and error() response helpers
│   ├── middleware/
│   │   ├── auth.middleware.ts   # Verify session, attach req.user
│   │   └── rbac.middleware.ts   # requireRole() — role enforcement
│   └── features/
│       ├── auth/
│       │   └── auth.router.ts   # Mounts better-auth handler
│       ├── loans/
│       │   ├── loans.router.ts
│       │   ├── loans.controller.ts
│       │   ├── loans.service.ts
│       │   └── loans.schema.ts
│       ├── borrowers/
│       ├── deposits/
│       ├── payments/
│       └── reports/
└── src/types/
    └── express.d.ts         # Augment Express Request with req.user
```

## Architecture Rules

### Thin Controllers, Fat Services
Controllers: parse request, call service, send response. No business logic.
Services own: all business logic, DB queries, transactions, domain rules.

```ts
// controller — thin
async function createLoan(req: Request, res: Response) {
  const body = req.validatedBody  // already validated by middleware
  const loan = await loansService.createLoan(body, req.user)
  res.json(success(loan))
}

// service — fat
async function createLoan(data: CreateLoanInput, actor: User) {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.create({ data })
    await tx.capitalEntry.create({ ... })  // ledger entry
    await tx.activityLog.create({ ... })   // audit trail
    return loan
  })
}
```

### Route-Level Validation
Zod runs as middleware before controller. Controller gets clean data via `req.validatedBody`.

```ts
router.post('/', validate(createLoanSchema), loansController.create)
```

### Multi-Table Writes Use Prisma Transactions
Any write touching 2+ tables must use `prisma.$transaction`. Never write partial state.
Examples: create loan + capital entry, record payment + update loan status, disburse + installment generation.

### Soft Deletes
No hard deletes. All deletable models have `deletedAt: DateTime?`.
All queries filter `where: { deletedAt: null }` unless explicitly querying deleted records.
Financial records (`LoanPayment`, `CapitalEntry`, `DepositPayout`) never deleted — immutable ledger.

## REST API Style

Base path: `/api/v1/`

### CRUD as Resources
```
GET    /api/v1/loans          # list (cursor-paginated)
GET    /api/v1/loans/:id      # single
POST   /api/v1/loans          # create
PATCH  /api/v1/loans/:id      # partial update
DELETE /api/v1/loans/:id      # soft delete (sets deletedAt)
```

### State Transitions as Actions
Financial state changes as action endpoints, not PATCH:
```
POST /api/v1/loans/:id/approve
POST /api/v1/loans/:id/disburse
POST /api/v1/loans/:id/cancel
POST /api/v1/loans/:id/payments     # record a payment
POST /api/v1/deposits/:id/activate
POST /api/v1/deposits/:id/close
```

### Pagination — Cursor-Based
All list endpoints use cursor pagination. Stable under concurrent writes.
```
GET /api/v1/loans?cursor=<id>&limit=20

// Response
{
  "data": [...],
  "meta": {
    "nextCursor": "<id>",
    "hasMore": true,
    "limit": 20
  }
}
```

## Response Shapes

Use helpers from `src/lib/response.ts`. Never construct response objects inline.

```ts
// Single resource
res.json(success(loan))
// → { "data": { ... } }

// List
res.json(successList(loans, meta))
// → { "data": [...], "meta": { "nextCursor": "...", "hasMore": true, "limit": 20 } }

// Error
res.status(404).json(error('LOAN_NOT_FOUND', 'Loan not found', 404))
// → { "error": { "code": "LOAN_NOT_FOUND", "message": "Loan not found", "status": 404 } }

// Validation error
res.status(422).json(validationError(fieldErrors))
// → { "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "status": 422, "fields": { "email": "Invalid email" } } }
```

All Zod validation errors return all field errors at once (not first-error-only).

## Auth (better-auth)

### Providers
- Email/password only. No email verification required. `autoSignIn: true`.
- No Google OAuth.
- Invite-only: signup blocked at `user.create.before` hook unless a valid `Verification` staging marker exists.
- better-auth `admin` plugin manages roles + banning.

### Session
- Duration: 2 days
- Cookie-based (`httpOnly`, `sameSite`)
- better-auth handles session creation, rotation, CSRF

### Invite-only signup flow
1. `POST /api/v1/invitations` — creates `Invitation` + `Verification` marker + sends email via Resend
2. `POST /api/v1/invitations/validate` — checks token, upserts `Verification` marker (10 min TTL), returns `{ email, role, expiresAt }`
3. `authClient.signUp.email(...)` — `before` hook reads marker, injects role, deletes marker; `after` hook marks invite `ACCEPTED`

### Invitations API (implemented — admin only except `/validate`)
```
POST /api/v1/invitations            # create + send email
GET  /api/v1/invitations            # list; ?status=PENDING|ACCEPTED|REVOKED|EXPIRED
POST /api/v1/invitations/:id/revoke # revoke pending invite
POST /api/v1/invitations/validate   # public — validate token + stage marker
```

### Middleware Usage
```ts
router.get('/me', requireAuth, handler)
router.post('/', requireAuth, requireRole('admin'), handler)
router.get('/reports', requireAuth, requireRole(['admin', 'manager']), handler)
```

## RBAC

Roles: `admin`, `manager`, `user`
Role stored on `User.role`. Checked server-side on every protected route.
Frontend may gate UI by role — backend authoritative. Never trust frontend role claims.

| Role | Access |
|------|--------|
| admin | Full access — all resources, user management, reports |
| manager | Loans, borrowers, deposits, payments, reports (no user management) |
| user | Read-only on assigned records (TBD per feature) |

## Audit Trail

All state-changing operations write to `ActivityLog`. Same Prisma transaction as main write.

```ts
await tx.activityLog.create({
  data: {
    userId: actor.id,
    category: 'AUDIT',
    action: 'LOAN_APPROVED',
    targetId: loan.id,
    metadata: { previousStatus: 'PENDING', newStatus: 'APPROVED' },
  }
})
```

## Logging (Pino)

Log every request (access log) + all errors.
Redact sensitive fields in all log output:

```ts
redact: ['req.body.password', 'req.body.idNumber', 'req.body.accountNumber', 'req.body.fullName', 'req.headers.authorization']
```

Never log: passwords, ID numbers, account numbers, full names, auth tokens.

## Error Codes (canonical list)

| Code | Status | Meaning |
|------|--------|---------|
| `VALIDATION_ERROR` | 422 | Zod schema failed |
| `UNAUTHORIZED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Authenticated, wrong role |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Duplicate or state conflict |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

Add domain-specific codes per feature (e.g. `LOAN_ALREADY_ACTIVE`, `INSUFFICIENT_FUNDS`).

## Prisma Client

Generates to custom path: `src/generated/prisma` (gitignored).
Import from there, not `@prisma/client`:

```ts
import { PrismaClient } from '../generated/prisma'
```

Run `prisma generate` after any schema change.

## Testing

Scope: unit test services only. Vitest, `globals: true`, `environment: 'node'`.
`src/test/setup.ts` sets dummy env vars (DATABASE_URL, BETTER_AUTH_*, RESEND_*) so
`env.ts` validation passes without a real `.env`.

The Prisma singleton is mocked per test file — no DB, no real queries. Each test
builds mocked models with `vi.hoisted`, then `vi.mock('../../lib/prisma')` to swap
the singleton for the mock. `$transaction` is stubbed to run its callback against a
mocked `tx`, so transactional service code runs unchanged against mock functions:

```ts
const mocks = vi.hoisted(() => {
  const tx = {
    loan: { create: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
    activityLog: { create: vi.fn() },
    // ...one entry per model the service touches
  };
  return {
    tx,
    prisma: {
      loan: { findFirst: vi.fn() },
      $transaction: vi.fn((callback) => callback(tx)),
    },
  };
});

vi.mock('../../lib/prisma', () => ({ prisma: mocks.prisma }));
```

Assert on the mock calls (e.g. `mocks.tx.activityLog.create` was called with the
expected audit payload) and on the service return value.

## Environment Variables

`src/lib/env.ts` is the single source of truth — Zod-validated at boot, throws on
invalid config. Import `env` from there; never read `process.env` directly.
In non-production, DATABASE_URL / BETTER_AUTH_SECRET / BETTER_AUTH_URL fall back to
localhost defaults; in production they are required. See `.env.example`.

| Var | Default (dev) | Notes |
|-----|---------------|-------|
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |
| `API_PORT` | `3000` | coerced to number |
| `CORS_ORIGIN` | `http://localhost:5173` | |
| `LOG_LEVEL` | `info` | pino levels + `silent` |
| `DATABASE_URL` | localhost fallback | required in prod |
| `BETTER_AUTH_SECRET` | dev fallback | required in prod |
| `BETTER_AUTH_URL` | `http://localhost:3000` | required in prod |
| `BETTER_AUTH_TRUSTED_ORIGINS` | — | optional, comma-separated |
| `WEB_URL` | `http://localhost:5173` | |
| `RESEND_API_KEY` | — | optional; email fails lazily if unset |
| `RESEND_FROM_EMAIL` | `noreply@example.com` | |