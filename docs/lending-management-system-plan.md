# Lending Management System Plan

## Summary

Position the app as a Lending Management System for lending institutions. V1 is borrowers, loans, repayments, arrears/default handling, depositors, deposits, reports, users, backups, and audit logs.

Keep the current stack: Express, Prisma, PostgreSQL, Zod, Vitest, Vite, React, TypeScript, Tailwind, shadcn-style UI, React Query, and pnpm.

## Active V1 Modules

- Borrowers
- Loans
- Loan approvals, disbursements, schedules, payments, arrears, defaults, and write-offs
- Dashboard and lending reports
- Depositors, deposits, payouts, withdrawals, and closes
- Users, roles, invitations, and audit logs
- Capital ledger for loan, deposit, payout, and owner-capital movements
- PostgreSQL backup/restore scripts for Coolify scheduled tasks

## Deferred

- Failed-login security audit logging; current small pass logs successful email/password login and forbidden API access

Deferred items stay out of the product surface until paying customers ask for them.

## Engineering Rules

- Do not rewrite the stack.
- Do not add new dependencies for product cleanup.
- Extend the implemented deposit/depositor modules in place; do not rebuild them.
- Prefer borrower and loan hardening over new modules.
- Add one focused test for any non-trivial lending logic change.

## Next Priorities

1. Keep open business-policy items in `docs/business-rules.md` as conditional backlog until a client asks.

## Completed

- Hardened loan schedule generation so rounded installment principal totals equal the loan principal.
- Added a Collections page for the overdue loan worklist using the existing reports endpoint.
- Added a Portfolio Report page using existing lending report endpoints.
- Improved borrower detail with loan summary cards and status-badged loan history.
- Fixed borrower detail breadcrumbs for cleaner demo navigation.
- Fixed loan seed data to use the current application date field.
- Changed borrower and loan seed IDs to UUIDs so seeded detail pages pass route validation.
- Seeded an active overdue loan so Collections and PAR demos show meaningful data.
- Added a Dashboard page heading for clearer route identity in browser QA.
- Ran browser QA across login, dashboard, borrowers, loans, collections, reports, settings, detail pages, and mobile dashboard.
- Browser-tested borrower creation, loan creation, approval, disbursement, and payment recording; fixed select-control warnings in the loan write forms.
- Aligned staff navigation and routes with existing API permissions by hiding manager/admin-only Collections and Reports from user accounts.
- Redirected staff from the manager/admin dashboard to Loans to avoid forbidden report API calls.
- Added server-generated loan payment receipt numbers and showed them in the loan payment table.
- Added committed Playwright e2e coverage for borrower creation, loan creation, approval, disbursement, payment, and receipt visibility.
- Improved loan payment audit metadata with receipt, method, reference, paid date, and allocation amounts.
- Added security audit logging for successful email/password login and forbidden API access.
- Added an admin-only Settings audit log table for the latest audit events.
- Added CSV exports for Loans, Collections, and the Portfolio by Status report.
- Added a single-company profile/settings section for organization details.
- Added depositor/deposit workflows with payouts, withdrawals, closes, and payout reversal.
- Added PostgreSQL backup/restore scripts referenced by the Coolify deployment guide.

## Demo Flow

1. Open Dashboard for portfolio health, collections, PAR, and overdue snapshot.
2. Open Borrowers and review a borrower profile with loan summary and loan history.
3. Open Loans and walk through loan status, schedule, and payments.
4. Open Collections for the overdue worklist.
5. Open Reports for the portfolio report.
