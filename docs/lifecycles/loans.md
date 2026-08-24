# Loans and payment lifecycle

Source: `apps/api/src/features/loans/`. Public service seam: `loans.service.ts`.

## State model

`PENDING -> APPROVED -> ACTIVE -> PAID`

`ACTIVE <-> IN_ARREARS`; `ACTIVE | IN_ARREARS -> DEFAULTED -> WRITTEN_OFF`; `PENDING | APPROVED -> CANCELED`.

Disbursement creates installments and moves an approved loan to `ACTIVE`. A paid loan reopens to `ACTIVE` when its last payment is reversed. An installment is `SCHEDULED`, `OVERDUE`, or `PAID`.

## Public operations

| Operation | Roles | Effects |
| --- | --- | --- |
| Create, approve, disburse, cancel | admin, manager | Loan state and audit log; disbursement creates a capital outflow and optional fee inflow. |
| Record payment | admin, manager | Creates payment and allocations, updates principal balance, installment status, capital inflow, and audit log. |
| Reverse payment | admin | LIFO-only correction: marks payment and capital entry reversed, preserves allocations, restores balance and installment state, and audits the reason. |
| Lock or unlock | admin | Collection freeze only. A lock blocks recording, not reversal or status changes. |
| Arrears, current, default, write-off, restructure | stated route role | State transition with audit logging. Current requires no overdue installment. |

## Payment invariants

1. Monetary inputs are positive Philippine-peso whole-cent amounts.
2. A payment uses the oldest unpaid installment first and allocates penalties, then interest, then principal.
3. The minimum payment is outstanding penalties plus interest for the oldest unpaid installment.
4. The payment cannot exceed the scheduled receivable. `remainingBalance` is principal-only; `totalPaid` includes every collected component.
5. A payment marks an installment paid only after its principal and interest are fully allocated. The overdue job marks unpaid scheduled past-due installments overdue.
6. Every lifecycle write locks the loan row in one transaction. This serializes payment, reversal, and loan-transition writes.
7. Reversal is idempotent by rejection: an already-reversed payment returns a conflict. Only the latest non-reversed payment by recording order may be reversed.

## Persistence and downstream effects

`LoanPayment` owns the receipt, payment split, method, and reversal metadata. `LoanPaymentAllocation` preserves the installment-level split, including after reversal. Active allocation queries exclude allocations whose payment is reversed.

Each recorded payment creates a `CapitalEntry` `INFLOW/LOAN_PAYMENT` and an activity log. Reversal marks both records reversed with a reason. Reports exclude reversed payments and capital entries. `Loan.remainingBalance`, overdue reporting, portfolio-at-risk, and auto-default all depend on the resulting installment and payment state.

## Tests to update

Use `loans.service.test.ts` for allocation, state, and reversal behavior. Use `autoDefault.job.test.ts` for overdue/default interactions. Add a service test whenever changing an allocation order, financial total, reversal condition, or lock-sensitive transition.
