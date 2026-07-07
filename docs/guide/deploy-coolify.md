# Deploying on a VPS with Coolify

Runbook for a production install. Three Coolify resources on one VPS:

```
┌──────────────────────── Coolify (Traefik + Let's Encrypt) ───────────────────────┐
│  app.yourdomain.com  →  web  (nginx static, apps/web/Dockerfile)                 │
│  api.yourdomain.com  →  api  (Express,      apps/api/Dockerfile)                 │
│  internal            →  PostgreSQL 16 (Coolify database resource)                │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Web and API must be subdomains of the same domain** — the session cookie is
SameSite=Lax; same-site (same registrable domain) keeps auth working. Don't put the API
on a different domain.

## 1. PostgreSQL

Coolify → project → **+ New → Database → PostgreSQL** (16+).

- Note the internal connection URL (`postgres://…@<container>:5432/…`). Use the internal
  URL, not the public one — don't expose 5432.
- **Backups (non-negotiable for financial data):** don't rely on ad-hoc manual dumps —
  use the scripts in [`scripts/backup/`](../../scripts/backup/README.md). Add
  `scripts/backup/backup.sh` as a daily Coolify **Scheduled Task** targeting an
  S3-compatible bucket (setup line and env vars in that README). Run the restore drill
  once before go-live.

## 2. API app

**+ New → Application → your Git repo**, then:

| Setting | Value |
|---|---|
| Build pack | Dockerfile |
| Dockerfile location | `apps/api/Dockerfile` |
| Base directory / context | `/` (repo root — the workspace lockfile lives there) |
| Port | `3000` |
| Domain | `https://api.yourdomain.com` |
| Health check path | `/health` |

Environment variables:

| Var | Value |
|---|---|
| `NODE_ENV` | `production` |
| `API_PORT` | `3000` |
| `DATABASE_URL` | internal Postgres URL from step 1 |
| `BETTER_AUTH_SECRET` | long random string — `openssl rand -base64 48` |
| `BETTER_AUTH_URL` | `https://api.yourdomain.com` |
| `CORS_ORIGIN` | `https://app.yourdomain.com` |
| `WEB_URL` | `https://app.yourdomain.com` (invite/reset email links) |
| `RESEND_API_KEY` | from Resend dashboard |
| `RESEND_FROM_EMAIL` | verified sender, e.g. `noreply@yourdomain.com` |
| `LOG_LEVEL` | `info` |

Notes:

- `SHADOW_DATABASE_URL` is **not** needed in production (dev-only, for `migrate dev`).
- Migrations run automatically on every boot: the container start command is
  `prisma migrate deploy && node dist/index.js`.
- `trust proxy` is already set for one hop (Traefik).

Deploy and confirm `https://api.yourdomain.com/health` returns `{"status":"ok"}`.

## 3. Web app

**+ New → Application → same repo**:

| Setting | Value |
|---|---|
| Build pack | Dockerfile |
| Dockerfile location | `apps/web/Dockerfile` |
| Base directory / context | `/` (repo root) |
| Port | `80` |
| Domain | `https://app.yourdomain.com` |

One environment variable, marked as **Build Variable** (Vite inlines it at build time —
a runtime-only var does nothing):

| Var | Value |
|---|---|
| `VITE_API_URL` | `https://api.yourdomain.com` |

## 4. First admin (one-time)

Fresh DB has no users and signup is invite-only. In Coolify, open the **API container
terminal** and run:

```bash
BOOTSTRAP_ADMIN_EMAIL=owner@company.com \
BOOTSTRAP_ADMIN_PASSWORD='a-strong-password' \
BOOTSTRAP_ADMIN_NAME='Owner Name' \
node dist/scripts/bootstrap-admin.js
```

Aborts safely if an admin already exists. Do **not** run `prisma:seed` in production —
it creates fake borrowers, loans, and deposits.

Then log in at `https://app.yourdomain.com` and immediately:

1. **Settings → Company Profile** — fill in app name, logo, and contact details.
2. **Settings → Business Capital** — record starting capital, or net capital reads wrong
   from day one.
3. **Settings → Invite User** — invite staff with proper roles.

## 5. Go-live smoke test

Click through once on production before handing over:

1. Create borrower → create loan (with a fee) → approve → disburse (fee checkbox on).
2. Record a payment → print the receipt → reverse the payment → re-enter it.
3. Create depositor → deposit → record payout → check dashboard net capital adds up:
   capital + deposits + payments + fees − disbursements − payouts.
4. Log in as a manager account — confirm Settings is hidden and delete/reverse buttons
   are absent.

## 6. Upgrades

Push to the deploy branch → Coolify rebuilds both apps. Migrations apply automatically on
API boot. Zero manual steps. If a deploy includes a migration and fails mid-boot, the
container restarts and retries — check API logs first.

## 7. Operational notes

- **Logs:** Coolify → app → Logs (Pino JSON). Requests ≥500 log as `error`, 4xx as `warn`.
- **Auto-default job** runs inside the API process daily at midnight Manila (and once at
  boot) — no separate worker to deploy.
- **Rate limit:** 2000 requests / 15 min per IP. An office behind one NAT shares that
  budget; bump in `apps/api/src/index.ts` if a large client hits 429s.
- **Email:** invites and password resets fail loudly if Resend is misconfigured — a failed
  invite is auto-revoked so it can simply be re-sent after fixing the key.
- **Restore drill:** quarterly, run `scripts/backup/restore.sh` against a scratch database
  (`CONFIRM_RESTORE=yes`, see [`scripts/backup/README.md`](../../scripts/backup/README.md))
  and open the app against it. A backup that's never been restored is a hope, not a backup.
