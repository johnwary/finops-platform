---
name: Schema design session notes
description: Prisma schema status and key design decisions
type: project
---

## Status: Schema written and locked

`apps/api/prisma/schema.prisma` complete. No migrations run yet.

## Key Decisions

**Auth** — better-auth owns `User`, `Session`, `Account`, `Verification`. App extends `User` only.

**ActivityLog** — single table, `category` enum (`AUDIT` | `ACTIVITY`). Merged from LMS's two tables.

**CapitalEntry** — polymorphic: `source` enum + `sourceId` string. No nullable FK sprawl. Immutable ledger — no soft deletes.

**Phone** — normalized only, no raw column. Format in app layer.

**Soft deletes** — `Loan` has `deletedAt`. Financial records (`LoanPayment`, `CapitalEntry`, `DepositPayout`) immutable.

## Domain Models

- `Borrower` → `Loan` → `LoanPayment`, `LoanInstallment`, `LoanProvisionEvent`
- `Depositor` → `Deposit` → `DepositPayout`
- `BusinessFund`
- `CapitalEntry` (ledger)
- `ActivityLog`

## Next Steps

1. Run first migration (`pnpm --filter api prisma:migrate`)
2. Seed DB (`pnpm --filter api prisma:seed`)
3. Build auth flow (better-auth setup + middleware)
4. Start feature routes: loans first
