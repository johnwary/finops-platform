# API Feature Guide

This guide describes how to add a backend feature or module from scratch. It uses borrowers as the example, but the same sequence applies to loans, deposits, reports, or any new domain feature.

## Mental Model

API work is built as a vertical slice from the database up to the route:

```txt
Prisma model
-> Zod validation schemas
-> service (business logic + DB)
-> controller (thin request/response)
-> router (wiring + middleware)
-> index (mount the router)
```

Start from the data model. Do not start by writing controllers. Controllers have nothing to do until the service exists, and the service has nothing to do until the model and schema are defined.

## Recommended Order

```txt
1. schema.prisma     — define the model
2. migrate           — run the migration, regenerate the client
3. borrowers.schema.ts  — Zod input validation
4. borrowers.service.ts — business logic, DB queries
5. borrowers.service.test.ts — unit tests for the service
6. borrowers.controller.ts  — request parsing, delegate to service
7. borrowers.router.ts      — wire middleware, validation, controller
8. index.ts          — mount the router
```

Work one layer at a time. Each layer should compile and be testable before moving up.

---

## 1. Prisma Model

Define the model in:

```txt
apps/api/prisma/schema.prisma
```

The borrower model looks like this:

```prisma
model Borrower {
  id                    String       @id @default(uuid())
  firstName             String
  middleName            String?
  lastName              String
  email                 String       @db.Citext
  phone                 String
  phoneNormalized       String
  address               String
  dateOfBirth           DateTime
  gender                Gender
  idType                IdType
  idNumber              String
  occupation            String?
  incomeSource          IncomeSource
  monthlyIncome         Decimal?     @db.Decimal(12, 2)
  emergencyContactName  String?
  emergencyContactPhone String?
  notes                 String?
  deletedAt             DateTime?
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  loans Loan[]

  @@index([lastName, firstName])
  @@index([phone])
  @@index([phoneNormalized])
  @@index([idNumber])
  @@index([deletedAt])
}
```

Rules to follow when defining any model:

- Always include `id`, `createdAt`, `updatedAt`, and `deletedAt` on every entity model.
- `deletedAt` is the soft-delete field. All queries must filter `{ deletedAt: null }`.
- Use `@db.Citext` on email so uniqueness and lookup are case-insensitive at the DB level.
- Use `@db.Decimal(12, 2)` for monetary values. Never use `Float`.
- Add `@@index` for every field that will be searched, filtered, or ordered on.
- Use `onDelete: Restrict` on foreign keys that reference financial records (prevents orphaning).
- Financial records (`LoanPayment`, `CapitalEntry`, `DepositPayout`) are immutable — no soft delete, no update.

After editing the schema, run:

```bash
pnpm --filter api prisma:migrate    # creates migration + applies it
pnpm --filter api prisma:generate   # regenerates Prisma client
```

---

## 2. Zod Validation Schemas

Create:

```txt
apps/api/src/features/borrowers/borrowers.schema.ts
```

Zod schemas define what the API accepts. They are the first line of defense against bad input. Controllers never see raw request data — only validated, typed data from these schemas.

Pattern:

```ts
import { z } from 'zod'

export const createBorrowerSchema = z.object({
  firstName: z.string().min(1).max(255).trim(),
  middleName: z.string().max(255).trim().optional(),
  lastName: z.string().min(1).max(255).trim(),
  email: z.email().toLowerCase(),                          // Zod v4: z.email() not z.string().email()
  phone: z.string().trim().regex(phoneRegex, 'Invalid PH phone number'),
  address: z.string().min(1).max(500).trim(),
  dateOfBirth: z.coerce.date(),
  gender: z.enum(['MALE', 'FEMALE']),
  idType: z.enum(['NATIONAL_ID', 'PASSPORT', 'DRIVER_LICENSE']),
  idNumber: z.string().min(1).max(100).trim(),
  occupation: z.string().max(255).trim().optional(),
  incomeSource: z.enum(['EMPLOYMENT', 'BUSINESS', 'PENSION', 'OTHER']),
  monthlyIncome: z.coerce.number().positive().optional(),
  emergencyContactName: z.string().max(255).trim().optional(),
  emergencyContactPhone: z.string().trim().regex(phoneRegex, 'Invalid PH phone number').optional(),
  notes: z.string().max(2000).trim().optional(),
})

export const updateBorrowerSchema = createBorrowerSchema.partial()

export const listBorrowersSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().max(100).trim().optional(),
})

export const borrowerParamsSchema = z.object({
  id: z.uuid(),                                            // Zod v4: z.uuid() not z.string().uuid()
})

export type CreateBorrowerInput = z.infer<typeof createBorrowerSchema>
export type UpdateBorrowerInput = z.infer<typeof updateBorrowerSchema>
export type ListBorrowersInput = z.infer<typeof listBorrowersSchema>
```

Rules:

- Export inferred TypeScript types from each schema (`z.infer<typeof ...>`).
- Export one schema per operation: create, update, list, params.
- Use `z.email()` and `z.uuid()` directly — not `z.string().email()` or `z.string().uuid()` (Zod v4).
- For normal editable CRUD resources, update schema is `createSchema.partial()`. For financial or stateful records, define an explicit update schema listing only what is actually editable (e.g. deposits only allow `notes` and `reference` to be patched — not amount, rate, or term).
- Validate IDs via params schema — never trust raw `:id` strings.
- Use `z.coerce` for query params that arrive as strings (numbers, dates).
- The `validate` middleware attaches clean data to `req.validatedBody`, `req.validatedQuery`, `req.validatedParams`. Read from those — never from `req.body` directly.

---

## 3. Service

Create:

```txt
apps/api/src/features/borrowers/borrowers.service.ts
```

All business logic lives here. The service is the most important layer. Controllers are thin; services are fat.

A service function handles:

1. Existence checks (404 if record not found or soft-deleted)
2. Business rule validation (409 if email/idNumber conflicts, active loans block delete)
3. Data transformation (normalize phone, format names)
4. DB reads and writes — always inside `prisma.$transaction` for multi-table writes
5. Audit log entry inside the same transaction

Example — `createBorrower`:

```ts
export async function createBorrower(data: CreateBorrowerInput, actor: AuthUser) {
  const existing = await prisma.borrower.findFirst({
    where: {
      OR: [{ email: data.email }, { idNumber: data.idNumber }],
      deletedAt: null,
    },
  })

  if (existing?.email === data.email) {
    throw new AppError('CONFLICT', 'Email already in use', 409)
  }
  if (existing?.idNumber === data.idNumber) {
    throw new AppError('CONFLICT', 'ID number already in use', 409)
  }

  const phoneNormalized = normalizePhone(data.phone)

  return prisma.$transaction(async (tx) => {
    const borrower = await tx.borrower.create({
      data: { ...data, phoneNormalized },
    })

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'BORROWER_CREATED',
        targetId: borrower.id,
        metadata: {
          name: formatBorrowerName(borrower),
          email: borrower.email,
        },
      },
    })

    return borrower
  })
}
```

Rules for every service:

- Always check `deletedAt: null` in every query.
- Pre-check uniqueness constraints before writing to provide clear error messages. The DB unique constraint is still the safety net — the pre-check is for UX.
- For soft-deletable models with unique fields (email, idNumber), Prisma `@unique` alone is not enough — it would block reuse of a value after soft delete. Add a partial unique index in the SQL migration instead: `CREATE UNIQUE INDEX "Borrower_email_unique_active" ON "Borrower" (email) WHERE "deletedAt" IS NULL`. This enforces uniqueness only among active records.
- Use `prisma.$transaction` for any write that touches more than one table.
- Always write an `ActivityLog` entry inside the same transaction as the main write.
- For financial flows (deposit received, payout made, withdrawal, loan disbursed, payment received), also write a `CapitalEntry` inside the same transaction. This is the capital ledger — it tracks every peso in and out of the business. `INFLOW` = money entering (deposit received, loan repayment). `OUTFLOW` = money leaving (deposit payout, loan disbursed).
- Throw `AppError` (not raw `Error`) so the error handler maps it correctly.
- Use `try/catch` on write operations to catch Prisma P2002 (unique constraint violation) and map it to `CONFLICT` 409.
- Never return deleted records.

### Cursor Pagination

All list endpoints use cursor-based pagination:

```ts
export async function listBorrowers({ cursor, limit, search }: ListBorrowersInput) {
  const take = limit + 1

  const rows = await prisma.borrower.findMany({
    where: {
      deletedAt: null,
      ...(search ? buildSearchWhere(search) : {}),
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { createdAt: 'desc' }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take,
    include: { _count: { select: { loans: true } } },
  })

  const hasMore = rows.length > limit
  const data = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? data[data.length - 1].id : null

  return { data, meta: { nextCursor, hasMore, limit } }
}
```

The trick: fetch `limit + 1` rows. If you get back more than `limit`, there is a next page. Slice off the extra row. Set `nextCursor` to the last real row's ID.

### Audit Log

Every state-changing operation writes an `ActivityLog` entry inside the same Prisma transaction. This guarantees the audit record is never written if the main write fails (and vice versa).

| Operation | `action` | `category` | Metadata |
|---|---|---|---|
| Create | `BORROWER_CREATED` | `AUDIT` | name, email |
| Update | `BORROWER_UPDATED` | `AUDIT` | name, email, fields (list of changed keys) |
| Delete | `BORROWER_DELETED` | `AUDIT` | name, email (pre-delete snapshot) |

Always include `userId` (from `actor.id`) and `targetId` (the record's ID).

---

## 4. Service Tests

Create:

```txt
apps/api/src/features/borrowers/borrowers.service.test.ts
```

Test the service only. Do not test controllers or routers — they are too thin to justify unit tests. Test the real behavior: what the service does given certain DB state.

Use Prisma with SQLite in-memory. No mocking Prisma.

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createBorrower, getBorrower, listBorrowers } from './borrowers.service'
import { prisma } from '@/lib/prisma'

const actor = { id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'admin' }

describe('createBorrower', () => {
  it('creates borrower and activity log', async () => {
    const borrower = await createBorrower(validInput, actor)
    expect(borrower.email).toBe(validInput.email)

    const log = await prisma.activityLog.findFirst({ where: { targetId: borrower.id } })
    expect(log?.action).toBe('BORROWER_CREATED')
  })

  it('throws CONFLICT if email exists', async () => {
    await createBorrower(validInput, actor)
    await expect(createBorrower(validInput, actor)).rejects.toMatchObject({ code: 'CONFLICT' })
  })
})
```

What to test per service function:

- Happy path: record created/updated/deleted, activity log written.
- 404 path: function throws `NOT_FOUND` when record does not exist or is soft-deleted.
- 409 path: uniqueness conflicts throw `CONFLICT`.
- Business rule blocks: e.g., soft delete blocked if active loans exist.
- Input transformations: phone normalized, email lowercased.

Run a single test file:

```bash
pnpm --filter api test -- --run src/features/borrowers/borrowers.service.test.ts
```

---

## 5. Controller

Create:

```txt
apps/api/src/features/borrowers/borrowers.controller.ts
```

Controllers are thin. They do three things only:

1. Read clean data from `req.validatedBody`, `req.validatedQuery`, `req.validatedParams`
2. Call the service
3. Send the response via `success()`, `successList()`, or set status 204

```ts
import type { Request, Response, NextFunction } from 'express'
import { success, successList } from '@/lib/response'
import * as service from './borrowers.service'

export const listBorrowersController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.validatedQuery as ListBorrowersInput
    const result = await service.listBorrowers(query)
    res.json(successList(result.data, result.meta))
  } catch (err) {
    next(err)
  }
}

export const createBorrowerController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.validatedBody as CreateBorrowerInput
    const borrower = await service.createBorrower(body, req.user!)
    res.status(201).json(success(borrower))
  } catch (err) {
    next(err)
  }
}

export const deleteBorrowerController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.validatedParams as BorrowerParamsInput
    await service.softDeleteBorrower(id, req.user!)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
```

Rules:

- No business logic. No DB queries. No conditional branching on domain state.
- Always pass `req.user!` to service functions that write — the service needs the actor for the audit log.
- Always `try/catch` and forward to `next(err)` — the central error handler maps `AppError` to the correct response shape.
- Use `success()` for single records, `successList()` for paginated lists.
- Return 201 on create, 204 on delete (no body), 200 on everything else.

---

## 6. Router

Create:

```txt
apps/api/src/features/borrowers/borrowers.router.ts
```

The router wires middleware, validation, and controllers together for each route.

```ts
import { Router } from 'express'
import { requireAuth } from '@/middleware/auth.middleware'
import { requireRole } from '@/middleware/rbac.middleware'
import { validate } from '@/middleware/validate.middleware'
import {
  createBorrowerSchema,
  updateBorrowerSchema,
  listBorrowersSchema,
  borrowerParamsSchema,
} from './borrowers.schema'
import * as controller from './borrowers.controller'

const router = Router()

router.use(requireAuth)

router.get('/', requireRole(['admin', 'manager', 'user']), validate(listBorrowersSchema, 'query'), controller.listBorrowersController)
router.get('/:id', requireRole(['admin', 'manager', 'user']), validate(borrowerParamsSchema, 'params'), controller.getBorrowerController)
router.post('/', requireRole(['admin', 'manager']), validate(createBorrowerSchema), controller.createBorrowerController)
router.patch('/:id', requireRole(['admin', 'manager']), validate(borrowerParamsSchema, 'params'), validate(updateBorrowerSchema), controller.updateBorrowerController)
router.delete('/:id', requireRole('admin'), validate(borrowerParamsSchema, 'params'), controller.deleteBorrowerController)

export { router as borrowersRouter }
```

Rules:

- `requireAuth` once at the top via `router.use()` — applies to all routes in this router.
- `requireRole` per route — roles differ per operation.
- `validate(schema)` defaults to `req.body`. Pass `'query'` or `'params'` as second arg for those sources.
- For PATCH, validate both params and body separately.
- RBAC pattern for borrowers:
  - Read (`GET`) — `admin`, `manager`, `user`
  - Write (`POST`, `PATCH`) — `admin`, `manager`
  - Delete (`DELETE`) — `admin` only

---

## 7. Mount the Router

Register the borrowers router in the Express app entry point:

```txt
apps/api/src/index.ts
```

```ts
import { borrowersRouter } from './features/borrowers/borrowers.router.js'
import { depositsRouter } from './features/deposits/deposits.router.js'

app.use('/api/v1/borrowers', borrowersRouter)
app.use('/api/v1/deposits', depositsRouter)
```

Two things to note:
- Import paths use `.js` extensions (ESM — this repo uses `"type": "module"`).
- All feature routers mount under `/api/v1/[resource]`. The resource name is always plural.

---

## 8. State Transition Endpoints

Some features have status fields that change as a result of deliberate business events — not arbitrary edits. These are modeled as action endpoints, not PATCH.

### Why Not PATCH?

A generic `PATCH /deposits/:id { status: 'ACTIVE' }` has no guardrails. The client can set any status at any time. There is no place to enforce rules like "a deposit can only be activated if it is currently pending" or "a payout cannot be recorded on a closed deposit." Side effects (creating a payout record, updating balances, writing a specific audit log entry) have no natural home.

State transition endpoints solve this:

```txt
POST /api/v1/deposits/:id/activate
POST /api/v1/deposits/:id/payout
POST /api/v1/deposits/:id/close
```

Each endpoint owns one transition. The service function for that endpoint enforces the rules for that specific event.

### Prisma Model — Status Field

Add a status enum and field to the model:

```prisma
enum DepositStatus {
  ACTIVE
  WITHDRAWN
  CLOSED
}

model Deposit {
  id        String        @id @default(uuid())
  status    DepositStatus @default(ACTIVE)
  // ...other fields
  deletedAt DateTime?
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  payouts DepositPayout[]

  @@index([status])
  @@index([deletedAt])
}
```

Note: not every feature needs a `PENDING` state. Deposits are created directly as `ACTIVE` — there is no activation step. Design the status enum around your actual business flow, not assumed workflow stages.

### Zod Schemas — Transition Input

Each transition may accept a body or may need no body at all. Define a schema per transition:

```ts
// Payout requires financial fields
export const recordPayoutSchema = z.object({
  amount: z.coerce.number().positive(),
  principalPortion: z.coerce.number().min(0).default(0),
  returnPortion: z.coerce.number().min(0).default(0),
  paidAt: z.coerce.date().optional(),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'GCASH', 'CHECK']),
  notes: z.string().max(2000).trim().optional(),
})

// Withdrawal only needs optional notes
export const withdrawDepositSchema = z.object({
  notes: z.string().max(2000).trim().optional(),
})

export type RecordPayoutInput = z.infer<typeof recordPayoutSchema>
export type WithdrawDepositInput = z.infer<typeof withdrawDepositSchema>
```

### Service — Guard the Transition

Each transition function does five things for financial flows:

1. Fetch the record and verify it exists
2. Check current status — throw `[FEATURE]_INVALID_STATE` (409) if not allowed
3. Write the state change inside a transaction
4. Write a `CapitalEntry` for any money movement inside the same transaction
5. Write an `ActivityLog` entry inside the same transaction

```ts
export async function withdrawDeposit(id: string, data: WithdrawDepositInput, actor: Actor) {
  const deposit = await prisma.deposit.findFirst({ where: { id, deletedAt: null } })
  if (!deposit) throw new AppError('NOT_FOUND', 'Deposit not found.', 404)

  if (deposit.status !== 'ACTIVE') {
    throw new AppError(
      'DEPOSIT_INVALID_STATE',
      `Cannot withdraw a deposit with status ${deposit.status}.`,
      409,
    )
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.deposit.update({
      where: { id },
      data: { status: 'WITHDRAWN', withdrawnAt: new Date() },
    })

    // Capital outflow: principal returned to depositor
    await tx.capitalEntry.create({
      data: {
        flowType: 'OUTFLOW',
        source: 'DEPOSIT_WITHDRAWAL',
        sourceId: id,
        amount: deposit.amount,
        description: `Deposit withdrawn by depositor ${deposit.depositorId}`,
        createdById: actor.id,
      },
    })

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'DEPOSIT_WITHDRAWN',
        targetId: id,
        metadata: { amount: deposit.amount },
      },
    })

    return updated
  })
}
```

Key rules:

- Always check `deposit.status` before proceeding. Throw `[FEATURE]_INVALID_STATE` (409) if the current state does not allow this action.
- Financial flows require three writes in one transaction: domain record update + `CapitalEntry` + `ActivityLog`. All three or none.
- `CapitalEntry` `flowType`: `INFLOW` = money entering the business (deposit received, loan repayment). `OUTFLOW` = money leaving (payout, withdrawal, loan disbursed).
- Financial records created by transitions (`DepositPayout`, `LoanPayment`, `CapitalEntry`) are immutable — never add soft delete or update logic to them.
- The audit log `action` name describes the event, not the resource (`DEPOSIT_WITHDRAWN`, not `DEPOSIT_UPDATED`).

### Controller — Same Pattern as CRUD

```ts
export const activateDepositController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.validatedParams as DepositParamsInput
    const deposit = await service.activateDeposit(id, req.user!)
    res.json(success(deposit))
  } catch (err) {
    next(err)
  }
}

export const recordDepositPayoutController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.validatedParams as DepositParamsInput
    const body = req.validatedBody as DepositPayoutInput
    const payout = await service.recordDepositPayout(id, body, req.user!)
    res.status(201).json(success(payout))
  } catch (err) {
    next(err)
  }
}
```

### Router — Action Routes Go Under `/:id`

```ts
// CRUD routes
router.get('/', ...)
router.get('/:id', ...)
router.post('/', ...)
router.patch('/:id', ...)
router.delete('/:id', ...)

// State transition routes
router.post('/:id/activate', requireRole(['admin', 'manager']), validate(depositParamsSchema, 'params'), controller.activateDepositController)
router.post('/:id/payout', requireRole(['admin', 'manager']), validate(depositParamsSchema, 'params'), validate(depositPayoutSchema), controller.recordDepositPayoutController)
router.post('/:id/close', requireRole('admin'), validate(depositParamsSchema, 'params'), controller.closeDepositController)
```

Transitions always use `POST`. They are events, not updates. The URL makes the action explicit: `/deposits/:id/activate` reads as "activate this deposit."

### Transition Endpoint Reference (Deposits Example)

| Method | Path | Allowed From | Role |
|---|---|---|---|
| `POST` | `/api/v1/deposits/:id/payout` | `ACTIVE` | admin, manager |
| `POST` | `/api/v1/deposits/:id/withdraw` | `ACTIVE` | admin, manager |
| `POST` | `/api/v1/deposits/:id/close` | `ACTIVE` | admin |

### Testing Transitions

Test the guard logic explicitly — it is the most important behavior:

```ts
describe('activateDeposit', () => {
  it('activates a pending deposit and writes audit log', async () => {
    const deposit = await createDeposit({ status: 'PENDING' })
    const result = await activateDeposit(deposit.id, actor)
    expect(result.status).toBe('ACTIVE')

    const log = await prisma.activityLog.findFirst({ where: { targetId: deposit.id } })
    expect(log?.action).toBe('DEPOSIT_ACTIVATED')
  })

  it('throws INVALID_TRANSITION if deposit is already active', async () => {
    const deposit = await createDeposit({ status: 'ACTIVE' })
    await expect(activateDeposit(deposit.id, actor)).rejects.toMatchObject({
      code: 'INVALID_TRANSITION',
    })
  })

  it('throws INVALID_TRANSITION if deposit is closed', async () => {
    const deposit = await createDeposit({ status: 'CLOSED' })
    await expect(activateDeposit(deposit.id, actor)).rejects.toMatchObject({
      code: 'INVALID_TRANSITION',
    })
  })
})
```

Every valid "from" state and every invalid "from" state should be tested. This is the behavior that protects data integrity.

---

## Endpoint Reference

For the borrowers feature, the final route table is:

| Method | Path | Role | Validates |
|---|---|---|---|
| `GET` | `/api/v1/borrowers` | all | query |
| `GET` | `/api/v1/borrowers/:id` | all | params |
| `POST` | `/api/v1/borrowers` | admin, manager | body |
| `PATCH` | `/api/v1/borrowers/:id` | admin, manager | params + body |
| `DELETE` | `/api/v1/borrowers/:id` | admin | params |

---

## Response Shapes

All responses use the helpers in `apps/api/src/lib/response.ts`. Never construct response objects inline.

```ts
// Single resource
res.json(success(borrower))
// -> { data: { ... } }

// Paginated list
res.json(successList(rows, meta))
// -> { data: [...], meta: { nextCursor, hasMore, limit } }

// No content
res.status(204).send()

// Error (thrown as AppError, handled centrally)
// -> { error: { code, message, status } }
```

---

## Feature Checklist

Use this when adding any new API feature:

- Define Prisma model with `id`, `createdAt`, `updatedAt`, `deletedAt`.
- Add `@@index` for searchable, filterable, and ordered fields.
- Run `prisma:migrate` and `prisma:generate`.
- Write Zod schemas for create, update, list (query), and params. Use `partial()` for normal CRUD; define explicit update schema for financial/stateful records.
- Use `z.email()` and `z.uuid()` directly (Zod v4) — not `z.string().email()`.
- Export inferred TypeScript types from each schema.
- For unique fields on soft-deletable models: add a partial unique index in the migration SQL (`WHERE "deletedAt" IS NULL`) — do not rely on Prisma `@unique` alone.
- Write service functions — existence checks, business rules, transactions, audit log.
- For financial flows: write `CapitalEntry` + `ActivityLog` in the same transaction as the domain write.
- Write service unit tests — happy path, 404, 409, business rule blocks.
- Write thin controllers — read validated input, call service, send response.
- Write router — `requireAuth` once, `requireRole` per route, `validate` per source.
- Mount router in `index.ts` under `/api/v1/[feature]`.
- For features with status: add transition endpoints (`POST /:id/action`) — not PATCH.
- Guard each transition: check current status, throw `INVALID_TRANSITION` if not allowed.
- Financial records created by transitions are immutable — no soft delete, no update.
- Test every valid and invalid "from" state for each transition.
- Verify all routes return correct status codes and response shapes.
