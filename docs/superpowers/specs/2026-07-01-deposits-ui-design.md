# Deposits & Depositors UI — Design

**Date:** 2026-07-01
**Status:** Approved, ready for implementation plan

## Context

The deposits/depositors API was fully built but only reachable as of PR #2 (routers mounted, concurrency locked, money validated). There is no frontend for it — the entire investor-capital side of the lending platform is invisible in the app. This spec covers building that UI to full parity with the existing loans/borrowers features, so the module is demo-able to clients.

The web app already has two mature, near-identical templates to clone:
- **borrowers** → **depositors** (a person/investor; CRUD + soft-delete)
- **loans** → **deposits** (placed funds with term/rate/payout-type; action endpoints for payout/withdraw/close)

This is pattern-replication, not net-new design. No new dependencies, no new architectural patterns.

## API surface (already implemented)

**Depositors** (`/api/v1/depositors`): list (search, cursor), get, create, patch, delete (admin). Fields: name, email, phone, address, optional dateOfBirth/idType/idNumber/notes.

**Deposits** (`/api/v1/deposits`): list (filter status/type, cursor), get, create, patch, action endpoints `POST /:id/withdraw`, `POST /:id/close`, `POST /:id/payouts`, delete (admin).
- Deposit fields: depositorId, amount, expectedReturnRate (decimal fraction), expectedReturnRatePeriod, termMonths, startDate, depositType (SPECIAL|REGULAR), payoutType (MATURITY_ONLY|SEMI_ANNUAL|QUARTERLY|MONTHLY_INTEREST), reference, notes.
- Tracked state: status (ACTIVE|WITHDRAWN|CLOSED), totalPayoutPaid, principalReturned, payouts[] (each with amount/principalPortion/returnPortion/paidAt/method).
- **Payout rule (backend-enforced):** `principalPortion + returnPortion === amount` (cent-compared).

**RBAC:** list+get readable by all roles incl. `user`; create/patch/actions require `['admin','manager']`; delete requires `admin`. Mirrors loans/borrowers exactly.

## Architecture

Two new feature folders mirroring the existing structure:

```
features/depositors/   ← clone of features/borrowers/
  components/  hooks/  schemas.ts  types.ts  utils.ts
features/deposits/     ← clone of features/loans/
  components/  hooks/  schemas.ts  types.ts  utils.ts
```

Conventions (all already in use): React Query hooks colocated one-per-endpoint; RHF + Zod forms with schemas shared between form and API; `apiFetch`/`apiFetchList`; Sonner toasts via `getErrorMessage`; `formatPeso`/`formatPercent`/date-fns Asia/Manila for all display; `toSearchParams` helper for query strings; `NumericInput` for money fields.

## Routes & Nav

`router.tsx` — lazy pages via existing `page()` wrapper:

| Path | Page |
|------|------|
| `/dashboard/depositors` | DepositorsListPage |
| `/dashboard/depositors/:id` | DepositorDetailPage |
| `/dashboard/deposits` | DepositsListPage |
| `/dashboard/deposits/:id` | DepositDetailPage |

`nav-config.ts` — two entries, visible to all roles (API allows `user` read); in-page mutations gated:

```
{ title: 'Deposits',   url: '/dashboard/deposits',   icon: <wallet/savings> }
{ title: 'Depositors', url: '/dashboard/depositors', icon: <user-group> }
```

Gating mirrors loans/borrowers: create/edit/action controls wrapped in `RequireRole role={['admin','manager']}` (fallback="hide"); delete in `RequireRole role="admin"`.

## Components

### Depositors (clone borrowers)
- `DepositorsListPage` + `DepositorTable` — search, cursor pagination
- `DepositorDetailPage` — info, linked deposits list, activity
- `CreateDepositorForm`, `EditDepositorForm`
- Delete: name-confirm dialog, disabled when depositor has active deposits

### Deposits (clone loans)
- `DepositsListPage` + `DepositTable` — filter by status/type, cursor pagination
- `DepositDetailPage` — mirrors `LoanDetailPage` structure with money semantics flipped:
  - **Header:** amount, status pill, depositor, term, expected rate
  - **KPI row:** total paid out · principal returned · return earned · principal remaining (all derived from `totalPayoutPaid`, `principalReturned`, `amount`, `payouts[]` — no projection math)
  - **Payout history table** from `payouts[]`
  - **Actions:** Record Payout / Withdraw / Close — status-gated + `RequireRole`
- `CreateDepositForm` — depositor picker, amount, rate, term, payoutType, type, dates
- Action forms: `RecordPayoutForm`, `WithdrawForm`, `CloseForm`

**Explicitly out of scope:** projected/expected payout schedule. It would require reimplementing payout math the backend doesn't expose, risking UI/backend disagreement in front of an investor. Add a backend calc endpoint first if clients request it. (YAGNI)

## Forms & money rules

- **RecordPayoutForm** — three fields: amount, principalPortion, returnPortion. Zod mirrors backend refine (`principal + return === amount`, cent-compared) so mismatches fail inline. Live "Split: ₱X + ₱Y = ₱Z" indicator with error state when the sum ≠ amount.
- **CreateDepositForm** — `expectedReturnRate` entered as percent (6 = 6%), converted `/100` before send. Extract a `toDepositRequestBody` helper (mirrors `toLoanRequestBody`) so the conversion is unit-testable.
- All money via `NumericInput`; all display via shared formatters (no raw `toLocaleString` — the bug the audit flagged in Settings).
- Loading skeleton / error alert / empty states cloned from loans/borrowers pages.

## Data flow & error handling

React Query hooks per endpoint: `useDeposits`, `useDeposit`, `useCreateDeposit`, `useUpdateDeposit`, `useRecordPayout`, `useWithdrawDeposit`, `useCloseDeposit`, `useDeleteDeposit`, plus depositor equivalents. Mutations invalidate `['deposits']` / `['deposit', id]` (and depositor keys). Errors → Sonner toast via `getErrorMessage`; server 409 (locked / invalid-state) surfaces as a toast.

## Testing

Per repo convention (schemas + pure transforms only; vitest already wired, no RTL):
- `features/deposits/schemas.test.ts` — payout split sum-check (valid + mismatch), createDeposit validation
- `features/deposits/hooks/useCreateDeposit.test.ts` — `toDepositRequestBody` percent→fraction
- Depositor schema test if it carries non-trivial validation (phone regex).

Backend is already covered (94 API tests). No component/RTL tests — matches current frontend stance.

## Verification

- `pnpm --filter web test` green (new schema/transform tests)
- `pnpm --filter web typecheck` + `lint` clean
- Manual: create depositor → create deposit → record payout (verify split validation) → withdraw/close → confirm nav, role gating, formatting, empty/error states.
