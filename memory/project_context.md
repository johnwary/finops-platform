---
name: finops-platform project context
description: Origin, stack, and monorepo structure of finops-platform
type: project
---

Same product as alpha-lms (loans + deposits + capital tracking) but:
- New company/client (not yet interviewed)
- Monorepo with pnpm workspaces (`apps/api`, `apps/web`)
- Better version — improving on LMS lessons learned

**Why:** Reuse LMS codebase as reference, not copy-paste. Polish architecture first.

**How to apply:** When suggesting patterns, compare against LMS at `/Users/johnwary/Documents/GitHub/alpha-lms-expressjs` (backend) and `/Users/johnwary/Documents/GitHub/alpha-lms-react` (frontend) as reference implementations.

## Stack
- Backend: Express 5, Prisma 7 (prisma-client), PostgreSQL + citext, Zod, Pino, Vitest
- Auth: `better-auth` (replaces custom JWT + Invitation + PasswordReset from LMS)
- Frontend: Vite + React + TypeScript + Tailwind v4 + shadcn
- Monorepo: pnpm workspaces
