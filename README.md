# FinOps Platform

A lending management system for small finance operations: it tracks borrowers and their loans through the full lifecycle (application, approval, disbursement, repayment, arrears, default, write-off), manages depositor funds and payouts, keeps a capital ledger, and produces portfolio and collections reports — all with role-based access and a full audit trail. It is deployed single-tenant, one instance per client, via Coolify.

## Features

- **Borrowers** — KYC records (name, contact, ID, income source), duplicate detection, phone search (09… / +639…), soft delete/restore.
- **Loans** — amortizing or interest-only structures; monthly/biweekly/weekly/daily frequencies; approve → disburse (schedule generation + cash outflow + optional fee income); payment recording with automatic penalties → interest → principal allocation and receipts; restructure; lock/unlock; admin payment reversal.
- **Collections, arrears & default** — daily overdue-marking job, collections worklist (CSV export), manual arrears flags, automatic default at 90 days past due with provisioning, admin write-off.
- **Depositors & Deposits** — investor records; deposits with expected return rate/period, term, and payout type; payout recording split into principal/return portions; withdraw/close returning remaining principal; admin payout reversal.
- **Business capital** — owner capital contributions and withdrawals feeding Net Capital.
- **Dashboard & Reports** — net capital, period collections/disbursements, loans by status, active portfolio, worst overdue loans; portfolio-by-status, period collections, and Portfolio at Risk reports with CSV export.
- **Company profile** — business details used on receipts.
- **Auth & RBAC** — invite-only signup (email link), email/password login, three roles (admin, manager, user) enforced server-side.
- **Audit trail** — every state-changing action is logged; financial records are never hard-deleted, only reversed.

## Tech Stack

**API:** Express 5, Prisma 7, PostgreSQL, better-auth, Zod, Pino, Resend, node-cron, Vitest
**Web:** Vite, React 19, TypeScript, Tailwind 4, shadcn/ui, React Query, Zustand, React Hook Form, Zod, Sonner
**Tooling:** pnpm workspaces, Playwright (e2e)

## Monorepo Layout

```
finops-platform/
├── apps/
│   ├── api/          # Express + Prisma backend (@finops/api)
│   └── web/          # Vite + React frontend (@finops/web)
├── docs/             # business rules, user manual, guides
├── package.json      # pnpm workspace root
└── pnpm-workspace.yaml
```

## Quickstart

**Prerequisites:** Node >= 20, pnpm >= 11, PostgreSQL (a running server; the API uses a `DATABASE_URL` and a `SHADOW_DATABASE_URL` for migrations).

```bash
# 1. Install dependencies (from repo root)
pnpm install

# 2. Configure the API environment
cp apps/api/.env.example apps/api/.env
# then edit apps/api/.env — set DATABASE_URL, SHADOW_DATABASE_URL,
# BETTER_AUTH_SECRET, and (for invite emails) RESEND_API_KEY

# 3. Create the schema and generate the Prisma client
pnpm api:prisma:migrate

# 4. Seed realistic sample data (borrowers, loans, users)
pnpm api:prisma:seed

# 5. Run both apps (API on :3000, web on :5173)
pnpm dev
```

Signup is invite-only. To create the first admin account, run:

```bash
pnpm --filter api bootstrap:admin
```

## Testing

```bash
pnpm api:test          # API service unit tests (Vitest)
pnpm e2e               # seed sample data + Playwright end-to-end tests
```

## Deployment

Deployed single-tenant per client on Coolify. See [docs/guide/deploy-coolify.md](docs/guide/deploy-coolify.md) for the full setup, including build configuration, environment variables, and `prisma migrate deploy` on start.

## Docs

- [User manual](docs/guide/user-manual.md) — staff-facing guide to every workflow.
- [Business rules](docs/business-rules.md) — baked-in domain decisions and open client questions.
- [Deploy on Coolify](docs/guide/deploy-coolify.md) — deployment guide.
- [API feature guide](docs/guide/api-feature-guide.md) / [triage](docs/guide/api-feature-triage.md) — building backend features.
- [Frontend feature guide](docs/guide/frontend-feature-guide.md) / [triage](docs/guide/frontend-feature-triage.md) — building frontend features.

## Locale

All amounts are in Philippine Peso (₱, `en-PH`, 2 decimals). All dates use `Asia/Manila` time — no user locale detection.
```