# Domain Findings — Borrowers & Loans

## Borrowers

| # | Gap | Severity |
|---|-----|----------|
| B1 | `emergencyContactPhone` not normalized | Low |
| B2 | No before/after values in audit log | Medium |
| B3 | `idNumber` editable with active loans | Medium |
| B4 | No active vs total loan count breakdown in list | Low |
| B5 | `BorrowerStatus` enum/field | Deferred → `docs/backlog/borrower-status.md` |

## Loans

| # | Gap | Severity |
|---|-----|----------|
| L1 | Service layer nearly untested — only `recordPayment` covered | High |
| L2 | No `IN_ARREARS` loan status — overdue only computable from installments | Medium |
| L3 | No `GET /:id/activity` endpoint — inconsistent with borrowers domain | Medium |
| L4 | `defaultLoan` race condition — concurrent calls both read `ACTIVE` before transaction commits, creating duplicate provision events | Medium |
| L5 | No loan restore endpoint — inconsistent with borrowers domain | Low |
| L6 | No underpay minimum validation on payment | Low |
| L7 | No `WRITTEN_OFF` status distinct from `DEFAULTED` | Low/Backlog |
