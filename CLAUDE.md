# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repo.

# FinOps Platform — Claude Guide

## Commands

```bash
# Root (runs both apps concurrently)
pnpm dev
pnpm build
pnpm lint

# API (from apps/api/ or via filter)
pnpm --filter api dev          # tsx watch
pnpm --filter api test         # vitest
pnpm --filter api test -- --run src/features/loans/loans.service.test.ts  # single test file
pnpm --filter api prisma:migrate   # prisma migrate dev
pnpm --filter api prisma:generate  # regenerate Prisma client
pnpm --filter api prisma:seed      # seed DB with fake data

# Web (from apps/web/ or via filter)
pnpm --filter web dev          # vite
pnpm --filter web build        # tsc -b && vite build
pnpm --filter web lint         # eslint
```

## Monorepo Structure

```
finops-platform/
├── apps/
│   ├── api/          # Express + Prisma backend (@finops/api)
│   └── web/          # Vite + React frontend (@finops/web)
├── package.json      # pnpm workspace root
└── pnpm-workspace.yaml
```

Root `pnpm dev` runs both apps.

## Roles

Three roles: `admin`, `manager`, `user`. Stored on `User.role`. Backend enforces (middleware), frontend gates UI.

API and frontend conventions live in `apps/api/CLAUDE.md` and `apps/web/CLAUDE.md` — read those when working in either app.

## Commits

Conventional Commits with scopes:
```
feat(loans): add installment calculation
fix(auth): correct session expiry check
chore(api): add Prisma migration for borrower KYC
refactor(web): extract loan form into feature folder
```

Scopes: `auth`, `loans`, `borrowers`, `deposits`, `api`, `web`, `types`, `db`

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->
