# Platform administration lifecycle

## Identity and invitations

Sources: `apps/api/src/lib/auth.ts` and `apps/api/src/features/invitations/`.

The system is invite-only. Admins create, list, and revoke invitations. Public invitation validation stages a short-lived verification marker; better-auth consumes that marker at sign-up and records acceptance. Roles are enforced server-side by route middleware.

Invitation status progresses from `PENDING` to `ACCEPTED`, `REVOKED`, or `EXPIRED`. Invitation operations are audited where implemented. Authentication state is managed by better-auth, rather than feature services.

## Company profile

Source: `apps/api/src/features/company/`.

There is one upserted company profile. Any authenticated user may read it; only an admin may update it. It affects application identity and receipt presentation, not financial totals.

## Activity

Source: `apps/api/src/features/activity/`.

Activity is an append-only audit read model. Financial lifecycle operations create `ActivityLog` entries in the same transaction as their state changes. Do not use activity logs as a substitute for the financial records or capital ledger.

Use the feature service tests plus application integration tests for role gates, invitation staging, and audit visibility.
