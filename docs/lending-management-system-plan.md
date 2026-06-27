# Lending Management System Plan

## Summary

Position the app as a Lending Management System for lending institutions. V1 is borrowers, loans, repayments, arrears/default handling, reports, users, and audit logs.

Keep the current stack: Express, Prisma, PostgreSQL, Zod, Vitest, Vite, React, TypeScript, Tailwind, shadcn-style UI, React Query, and pnpm.

## Active V1 Modules

- Borrowers
- Loans
- Loan approvals, disbursements, schedules, payments, arrears, defaults, and write-offs
- Dashboard and lending reports
- Users, roles, invitations, and audit logs
- Capital ledger for loan disbursements and repayments

## Deferred

- Depositors
- Deposits
- Deposit payouts
- Investor/savings workflows
- Single-company profile/settings for receipts and reports

These stay out of the product surface until paying customers ask for them.

## Engineering Rules

- Do not rewrite the stack.
- Do not add new dependencies for product cleanup.
- Keep dormant deposit schema/code until removal is worth a migration.
- Prefer borrower and loan hardening over new modules.
- Add one focused test for any non-trivial lending logic change.

## Next Priorities

1. Add deposit/investor modules only as a paid expansion.

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

## Demo Flow

1. Open Dashboard for portfolio health, collections, PAR, and overdue snapshot.
2. Open Borrowers and review a borrower profile with loan summary and loan history.
3. Open Loans and walk through loan status, schedule, and payments.
4. Open Collections for the overdue worklist.
5. Open Reports for the portfolio report.
