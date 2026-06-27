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

These stay out of the product surface until paying customers ask for them.

## Engineering Rules

- Do not rewrite the stack.
- Do not add new dependencies for product cleanup.
- Keep dormant deposit schema/code until removal is worth a migration.
- Prefer borrower and loan hardening over new modules.
- Add one focused test for any non-trivial lending logic change.

## Next Priorities

1. Harden loan payment allocation and payoff behavior.
2. Improve overdue and collections workflows.
3. Add lending-focused reports only when the dashboard proves the need.
4. Add deposit/investor modules only as a paid expansion.
