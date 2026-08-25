# Lending Management System — User Manual

Staff-facing guide. For business-rule decisions and open policy questions see
[business-rules.md](../business-rules.md). All amounts are Philippine Peso (₱); all dates
use Manila time.

## 1. Roles

| Role | Can do |
|---|---|
| **User** | No organization-record access until an assignment model exists |
| **Manager** | View and create/edit borrowers, loans, deposits, and depositors; approve/disburse loans; record payments and payouts; restructure; mark arrears/default; use collections and reports |
| **Admin** | Everything Manager can, plus: delete/restore records, write off loans, reverse payments/payouts, lock/unlock loans, business capital, user management, company profile, audit logs |

Backend enforces every rule — hiding a button is convenience, not security.

## 2. Getting in

- **Accounts are invite-only.** An admin sends an invitation from **Settings → Invite User**
  (choose the role). The invitee gets an email link, valid **7 days**, and sets their own
  password.
- **Login** with email + password. Sessions last **2 days**.
- **Forgot password** on the login page sends a reset email (link valid 1 hour).
- Admins can change roles, ban/unban users, and revoke pending invites in **Settings**.

## 3. Borrowers

**Borrowers** page → **Create Borrower**. Required: name, email, phone (09… or +639…),
address, date of birth, gender, ID type + number, income source. Duplicate email or ID
number is rejected.

- Search by name, email, or phone. Phone search understands both 09 and +639 formats.
- Edit anytime; changing the ID number is blocked while the borrower has active loans.
- **Delete** (admin): only possible when the borrower has no loans. Deleted borrowers can
  be restored by an admin.

## 4. Loans

### Lifecycle

```
PENDING → APPROVED → ACTIVE → PAID
   └→ CANCELED ←┘        ├→ IN_ARREARS ⇄ ACTIVE
                         └→ DEFAULTED → WRITTEN_OFF
```

| Status | Meaning |
|---|---|
| PENDING | Application recorded, awaiting approval |
| APPROVED | Approved, funds not yet released |
| ACTIVE | Disbursed, collecting |
| IN_ARREARS | Flagged behind on payments (shows on Collections) |
| PAID | Principal fully repaid |
| CANCELED | Stopped before disbursement (reason required) |
| DEFAULTED | Marked uncollectible-risk; provision recorded |
| WRITTEN_OFF | Loss taken (admin, from DEFAULTED only) |

### Creating a loan

**Loans → Create Loan.** Pick the borrower, type, amount, **monthly interest rate**
(enter 3 for 3%), term in months, payment frequency (monthly/biweekly/weekly/daily),
structure:

- **Amortizing** — equal payment per period (principal + interest).
- **Interest-only** — flat interest per period, full principal due on the last installment.

Optional: **loan fee** (collected at disbursement), **daily penalty rate** for overdue
installments, purpose, notes.

### Approve → Disburse

From the loan detail page. Disbursement asks for the method (cash/bank/GCash/check) and
date, generates the full installment schedule, and records the cash outflow. If the loan
has a fee, a **"Collect loan fee"** checkbox (ticked by default) records the fee as income.

### Recording payments

Loan detail → **Record Payment** (ACTIVE or IN_ARREARS loans only). The system allocates
automatically, oldest installment first: **penalties → interest → principal**.

- **Minimum:** payment must cover the outstanding penalties + interest of the oldest
  unpaid installment. Smaller amounts are rejected.
- **Maximum:** total scheduled receivable — early payoff pays full scheduled interest
  (see business-rules.md, open question 1).
- Every payment gets an auto receipt number. **Print** a receipt from the Payments tab.
- The loan flips to **PAID** automatically when principal reaches zero.

### Fixing a mistake — payment reversal (admin)

Payments tab → **Reverse** on the newest payment (reason required). This restores the loan
balance, reopens the affected installments, and removes the amount from the ledger. The
payment stays visible, marked **Reversed**.

- Only the **most recent** payment can be reversed. To fix an older one, reverse the newer
  payments first, then re-enter them correctly.
- Reversing the payment that closed a loan reopens it to ACTIVE.

### Collections, arrears, default

- Installments past due are marked **overdue automatically** (daily job, midnight Manila).
- **Collections** page lists every loan with an overdue installment, worst first, with
  days past due and contact info. Exportable to CSV.
- **Mark In Arrears / Mark Current** — manual flags for the collections workflow.
- **Mark Default** — manual, or **automatic at 90 days past due** (records a provision
  per BSP-aligned buckets).
- **Write Off** (admin) — final loss, from DEFAULTED only, reason required.

### Restructure

For ACTIVE, IN_ARREARS, or DEFAULTED loans: change rate, term, frequency, or structure.
Rebuilds the schedule **from today** against the remaining principal. Paid installments
are preserved for history. Blocked if an unpaid installment already has partial payments —
reverse those first.

### Lock / Unlock (admin)

**Lock** freezes payment acceptance (disputes, fraud review, legal holds) without changing
anything else. A locked loan shows a red **Locked** badge and rejects payments until an
admin unlocks it.

## 5. Depositors & Deposits

Depositors are investors who place money with the company.

- **Depositors** page: create with name, email, phone, address. Cannot be deleted while
  they have deposits.
- **Deposits → Create Deposit:** amount, expected return rate + period (monthly /
  quarterly / semi-annual / annual), term in months, payout type (maturity-only /
  semi-annual / quarterly / monthly interest), type (regular/special). Creating a deposit
  records the cash inflow.

### Payouts

Deposit detail → **Record Payout** while the deposit is ACTIVE. Split each payout into
**principal portion** and **return portion** (must sum to the total). Cumulative principal
payouts can never exceed the deposit amount.

- **Reverse** (admin): newest payout only, reason required — same rules as loan payment
  reversal.

### Ending a deposit

- **Withdraw** — depositor exits early.
- **Close** — deposit reached maturity.

Both return the **remaining** principal (anything already returned via payouts is not paid
twice) and record the outflow. Terminal deposits can be deleted by an admin; active ones
cannot.

## 6. Business Capital (admin)

**Settings → Business Capital.** Record owner money put into the business (amount, date,
remarks) and withdraw entries when capital is taken out. These entries feed **Net Capital**
on the dashboard — record starting capital here on day one, before disbursing anything.

## 7. Dashboard & Reports

- **Dashboard:** net capital (all inflows − outflows, reversals excluded), period
  collections and disbursements, loans by status, active portfolio, worst overdue loans.
- **Reports** (admin/manager): portfolio by status, collections for a period
  (today/week/month/quarter/year), **Portfolio at Risk** — % of outstanding balance
  sitting on loans with at least one overdue installment. CSV export available.

## 8. Settings (admin)

- **Company Profile** — name, logo, address, contact, tax ID; shown in the app shell/settings, not on payment receipts today.
- **Business Capital** — see §6.
- **Invite User / Invitations** — send, track, revoke invites.
- **Users** — change roles, ban/unban.
- **Audit Logs** — every state-changing action, who did it, and when. Nothing financial
  is ever hard-deleted; mistakes are reversed, not erased.

## 9. Quick answers

| "How do I…" | Do this |
|---|---|
| Fix a wrong payment amount | Admin → loan → Payments tab → Reverse (newest first) → re-enter |
| Stop payments on a disputed loan | Admin → Lock on the loan page |
| Record starting capital | Settings → Business Capital → Add Capital |
| See who's behind | Collections page (or Dashboard overdue list) |
| Give the borrower proof of payment | Payments tab → Print |
| Remove a borrower added by mistake | Admin → delete (only if they have no loans) |
| Add a staff account | Settings → Invite User (they self-register via email link) |
| Undo a deposit payout typo | Admin → deposit → Reverse on the payout |
