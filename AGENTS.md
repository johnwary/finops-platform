# Repository Guidelines

## Project Structure & Module Organization

This pnpm workspace contains a FinOps API and web app. The backend lives in `apps/api` and uses Express, Prisma, PostgreSQL, Zod, Pino, and Vitest. API code is organized by feature under `apps/api/src/features/<domain>/` with `*.router.ts`, `*.controller.ts`, `*.service.ts`, and `*.schema.ts` files. Helpers are in `apps/api/src/lib`, middleware in `apps/api/src/middleware`, jobs in `apps/api/src/jobs`, and database schema/migrations in `apps/api/prisma`.

The frontend lives in `apps/web` and uses Vite, React, TypeScript, Tailwind, shadcn-style components, React Query, Zustand, React Hook Form, and Zod. Feature code belongs in `apps/web/src/features/<domain>/`; reusable UI is in `apps/web/src/components/ui`, layout in `apps/web/src/components/layout`.

## Build, Test, and Development Commands

- `pnpm dev`: run API and web dev servers.
- `pnpm build`: build all workspaces.
- `pnpm lint`: run workspace lint scripts.
- `pnpm api:dev` / `pnpm web:dev`: run one app locally.
- `pnpm api:test`: run API Vitest tests.
- `pnpm api:prisma:migrate`: apply Prisma dev migrations.
- `pnpm api:prisma:generate`: regenerate Prisma client.
- `pnpm api:prisma:seed`: seed dev data.
- `pnpm web:build`: typecheck and build the frontend.

Use Node `>=20` and pnpm `>=9`.

## Coding Style & Naming Conventions

Use TypeScript throughout. Follow the feature-folder pattern and keep controllers thin: validate input, call services, and return wrapped responses. Put business logic, transactions, and domain rules in services. Use Zod for request and form validation.

Frontend imports should use the `@/` alias. React props should be named `[ComponentName]Props`; boolean props should use `is`, `has`, or `can` prefixes; event handlers should use `handle` prefixes. Prefer React Query for server state and Zustand for global UI state.

## Testing Guidelines

API tests use Vitest with setup in `apps/api/src/test/setup.ts`. Name tests `*.test.ts` and colocate them near the code under test, such as `apps/api/src/features/loans/loans.service.test.ts`. Focus service tests on domain behavior, database interactions, and transaction rules. Run one file with `pnpm --filter api test -- --run <path>`.

## Commit & Pull Request Guidelines

Git history uses Conventional Commits with scopes, for example `feat(borrowers): split name fields`, `fix(auth): correct session expiry`, and `chore(db): extend seed scenarios`.

Pull requests should include a summary, tests run, linked issue or task when available, and screenshots for UI changes. Note schema or migration changes.

## Security & Configuration Tips

Start from `apps/api/.env.example` for local environment variables. Do not commit secrets, API keys, local database URLs, generated build output, or `node_modules`. For financial records, preserve existing soft-delete and audit-trail patterns; do not hard-delete immutable transaction data.

## Agent skills

### Issue tracker

Issues are tracked in this repository's GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical triage labels are used. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context layout: root map with per-app context docs. See `docs/agents/domain.md`.
