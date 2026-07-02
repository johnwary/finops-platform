# Business Rules — Decisions & Open Questions

Living document. Two sections: **decisions baked into code** (with rationale, so they aren't
re-litigated by accident) and **open questions** that need a client/owner answer before we
build anything. Update this file whenever a rule changes.

_Last updated: 2026-07-02_

---

## Decisions baked into code

### Payment reversal is LIFO-only
Only the **most recent non-reversed payment** on a loan (or payout on a deposit) can be
reversed. To fix an older entry, reverse newer ones first, then re-enter them.

- **Why:** payment allocation (penalties → interest → principal, oldest installment first)
  assumes every earlier payment stands. Reversing out of order leaves installment coverage
  in states the allocator can never produce. LIFO matches standard bookkeeping correction
  practice and covers the real use case: staff notices a typo right after entry.

### Reversals use the exclusion model, not compensating entries
Reversing marks the original `CapitalEntry` / `LoanPayment` / `DepositPayout` with
`reversedAt` + reason. No offsetting counter-entry is created.

- **Why:** all reports already filter `reversedAt: null`. A compensating entry would be
  double-counted under that filter. Original rows are never deleted — the audit trail keeps
  the mistake and who reversed it.

### Reversing a payment can reopen a PAID loan
If reversal makes `remainingBalance > 0` on a PAID loan, status returns to ACTIVE and
`paidAt` clears. Affected installments revert to SCHEDULED (future due date) or OVERDUE.

### Deposit termination returns only unreturned principal
On withdraw/close, the capital outflow is `amount − principalReturned` and
`principalReturned` is set to the full amount. Principal returned earlier via payouts is
never paid out twice. Cumulative principal payouts may never exceed the deposit amount.

### Loan fee is an upfront fee, collected at disbursement, optional per disbursement
When a loan has a `loanFee`, disbursement records a separate `LOAN_FEE` capital inflow
(default on, un-tickable per disbursement). The fee is **not** deducted from the disbursed
amount in the ledger — disbursement outflow stays the full principal so fee income is
visible as its own inflow line.

### Loan lock is an admin collections freeze
`Loan.locked` blocks `recordPayment` only. It does not change status, stop penalty
accrual, or block other transitions. Intended for disputes, fraud review, legal holds.
Admin-only.

### Business capital is admin-only
Adding funds and withdrawing funds (owner capital in/out) are admin operations. Managers
see the resulting net-capital numbers but cannot move capital.

### Minimum payment guard
A payment must cover at least the outstanding **penalties + interest of the oldest unpaid
installment**. Smaller amounts are rejected (`PAYMENT_BELOW_MINIMUM`).

- **Why:** prevents principal-only trickle payments that hide delinquency. See open
  question below — some operators want to accept any cash.

---

## Open questions — need client decision before building

### 1. Early settlement / pretermination discount
**Current behavior:** a borrower can pay off early, but only at the **full scheduled
interest** (`PAYMENT_EXCEEDS_RECEIVABLE` caps at total scheduled receivable). No discount
for unaccrued interest.

**Question for client:** when a borrower settles early, do you discount future interest?
Common PH practice is to charge only accrued interest + principal, sometimes plus a
pretermination fee.

**If yes, we need:** a `settle` action endpoint that computes accrued-to-date interest,
optional pretermination fee %, closes remaining installments, and records the payoff.

### 2. Accepting payments below the minimum due
**Current behavior:** cash below the oldest installment's outstanding penalties + interest
is rejected.

**Question for client:** do collectors accept any amount handed to them (common for field
collections), or enforce the minimum? If any amount: we relax the guard and let partial
interest accumulate.

### 3. Penalty policy details
**Current behavior:** `penaltyRate` is a **daily** rate on the overdue installment's
outstanding principal, accruing from due date, no grace period, no cap.

**Questions for client:** grace period days? Penalty cap (e.g., max 100% of installment)?
Penalty on interest portion too, or principal only (current: principal only)?

### 4. Statement of account / printable receipts
**Current behavior:** receipt numbers are generated and stored; collections export to CSV.
No printable SOA or receipt layout.

**Question for client:** do you issue printed receipts / SOAs? If yes: which fields,
letterhead (company profile already stores name/address/logo), thermal or A4?

### 5. Deposit maturity visibility
**Current behavior:** deposits store `endDate`; no "maturing soon" report or filter.

**Question for client:** do you need a maturity calendar/report to plan cash for principal
returns? Cheap to add (filter + sort on existing data) once confirmed.

### 6. Auto-default threshold
**Current behavior:** system auto-defaults a loan when its earliest overdue installment
hits **90 days past due** (BSP-aligned buckets drive the provision amount).

**Question for client:** is 90 DPD the right trigger for your risk policy, or should this
be configurable (60/90/120)?

### 7. Interest-only loan rollover
**Current behavior:** interest-only loans balloon the full principal on the final
installment. No rollover/renewal flow — a new loan must be created manually.

**Question for client:** do you roll over interest-only principals into a new term as one
action? If frequent, worth a `renew` shortcut.
