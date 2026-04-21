---
name: Schema design session notes
description: Where we left off planning the Prisma schema — decisions made and pending
type: project
---

## Status: Planning — no schema written yet

`apps/api/prisma/schema.prisma` is still the empty Prisma-generated stub. No migrations run.

## Decisions Made

**1. Auth — use better-auth, not custom JWT**
- LMS had: custom `User`, `Invitation`, `PasswordReset`, manual JWT utils
- Finops will: let better-auth own `User`, `Session`, `Account`, `Verification` tables
- Extend `User` with app-specific fields only
- Why: better-auth handles session, password reset, invitations — no reinventing

**2. Merge AuditLog + UserActivityLog into one table**
- LMS had two identical-shape tables
- Finops will: one table with `category` enum (`AUDIT` | `ACTIVITY`)
- Why: same shape, same purpose, two tables is redundant

**3. Fix CapitalPool nullable FK design**
- LMS had: 5 optional FKs (`loanId?`, `paymentId?`, `depositId?`, etc.) on one row — fragile
- Finops will: polymorphic association — `sourceType` enum + `sourceId` string
- Why: cleaner, extensible, no nullable FK sprawl

**4. Drop phoneNormalized as separate column**
- LMS had: `phone` (raw) + `phoneNormalized` on Borrower + Depositor
- Finops will: store only normalized phone, format in app layer
- Why: redundant storage, normalization is app concern

**5. Soft deletes — decide per model, not blanket**
- LMS: inconsistent — only `Loan` had `deletedAt`
- Finops: evaluate per entity after client interview

## Pending — Need Client Interview First

- Role enum values (LMS had `STAFF_LOANS`, `STAFF_INVESTMENT`, `MANAGER`, `HEAD`, `ADMIN`)
- `LoanType`, `IncomeSource` enum values — business-specific
- Whether loans/deposits/borrowers domain even applies to new client
- Soft delete policy per entity

## What to Do When Resuming

1. Interview client → confirm domain models
2. Write schema starting with: auth (better-auth integration) → audit log → capital ledger
3. Domain models (Borrower, Loan, Deposit, etc.) last — most likely to change
4. Reference LMS schema at `/Users/johnwary/Documents/GitHub/alpha-lms-expressjs/prisma/schema.prisma`
