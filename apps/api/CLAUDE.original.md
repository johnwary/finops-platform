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
│   │   ├── auth.ts          # better-auth instance (email/password + Google)
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
Controllers only: parse request, call service, send response. No business logic.  
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
Zod validation runs as middleware before controller. Controller receives clean data via `req.validatedBody`.

```ts
router.post('/', validate(createLoanSchema), loansController.create)
```

### Multi-Table Writes Use Prisma Transactions
Any write that touches more than one table must use `prisma.$transaction`. Never write partial state.  
Examples: create loan + capital entry, record payment + update loan status, disburse + installment generation.

### Soft Deletes
No hard deletes. All deletable models have `deletedAt: DateTime?`.  
All queries must filter `where: { deletedAt: null }` unless explicitly querying deleted records.  
Financial records (LoanPayment, CapitalEntry, DepositPayout) are never deleted — immutable ledger.

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
Financial state changes modeled as action endpoints, not PATCH:
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
- Email/password with email verification required before login
- Google OAuth

### Session
- Duration: 2 days
- Cookie-based (httpOnly, sameSite)
- better-auth handles session creation, rotation, CSRF

### Config (`src/lib/auth.ts`)
```ts
export const auth = betterAuth({
  database: prismaAdapter(prisma),
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  emailVerification: { sendOnSignUp: true, sendVerificationEmail: async ({ user, url }) => {
    await resend.emails.send({ to: user.email, subject: 'Verify your email', ... })
  }},
  socialProviders: { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } },
  session: { expiresIn: 60 * 60 * 24 * 2 },
})
```

### Middleware Usage
```ts
// Require any authenticated user
router.get('/me', requireAuth, handler)

// Require specific role
router.get('/admin', requireAuth, requireRole('admin'), handler)
router.get('/reports', requireAuth, requireRole(['admin', 'manager']), handler)
```

## RBAC

Roles: `admin`, `manager`, `user`  
Role stored on `User.role`. Checked server-side on every protected route.  
Frontend may gate UI by role but backend is authoritative — never trust frontend role claims.

| Role | Access |
|------|--------|
| admin | Full access — all resources, user management, reports |
| manager | Loans, borrowers, deposits, payments, reports (no user management) |
| user | Read-only on assigned records (TBD per feature) |

## Audit Trail

All state-changing operations write to `ActivityLog`. Done inside the same Prisma transaction as the main write.

```ts
await tx.activityLog.create({
  data: {
    userId: actor.id,
    action: 'LOAN_APPROVED',
    entity: 'Loan',
    entityId: loan.id,
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
| `FORBIDDEN` | 403 | Authenticated but wrong role |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Duplicate or state conflict |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

Add domain-specific codes per feature (e.g. `LOAN_ALREADY_ACTIVE`, `INSUFFICIENT_FUNDS`).

## Prisma Client

Prisma generates to a custom path: `src/generated/prisma` (gitignored).  
Import from there, not `@prisma/client`:

```ts
import { PrismaClient } from '../generated/prisma'
```

Run `prisma generate` after any schema change.

## Testing

MVP scope: unit test services only.  
Test DB: SQLite in-memory (via Prisma `datasource` override in test env).  
No mocking Prisma — use real queries against in-memory DB.

`vitest.config.ts` does not exist yet — must be created to wire up the SQLite override:

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

```ts
// src/test/setup.ts
process.env.DATABASE_URL = 'file::memory:?cache=shared'
```

## Environment Variables

```
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://user:password@localhost:5432/finops_db
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@yourdomain.com
LOG_LEVEL=info
```
