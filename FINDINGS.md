# Domain Findings — Borrowers & Loans

## Borrowers

| # | Gap | Severity |
|---|-----|----------|
| B1 | `emergencyContactPhone` not normalized | ~~Low~~ Fixed |
| B2 | No before/after values in audit log | ~~Medium~~ Fixed |
| B3 | `idNumber` editable with active loans | ~~Medium~~ Fixed |
| B4 | No active vs total loan count breakdown in list | ~~Low~~ Fixed |
| B5 | `BorrowerStatus` enum/field | Deferred → `docs/backlog/borrower-status.md` |

## Loans

| # | Gap | Severity |
|---|-----|----------|
| L1 | Service layer nearly untested — only `recordPayment` covered | ~~High~~ Fixed |
| L2 | No `IN_ARREARS` loan status — overdue only computable from installments | ~~Medium~~ Fixed |
| L3 | No `GET /:id/activity` endpoint — inconsistent with borrowers domain | ~~Medium~~ Fixed |
| L4 | `defaultLoan` race condition — concurrent calls both read `ACTIVE` before transaction commits, creating duplicate provision events | ~~Medium~~ Fixed |
| L5 | No loan restore endpoint — inconsistent with borrowers domain | ~~Low~~ Fixed |
| L6 | No underpay minimum validation on payment | ~~Low~~ Fixed |
| L7 | No `WRITTEN_OFF` status distinct from `DEFAULTED` | ~~Low/Backlog~~ Fixed |
