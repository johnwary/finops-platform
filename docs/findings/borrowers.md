# Borrowers Backend Audit

Audited: 2026-05-09

## Architecture Compliance

| Layer | Status | Notes |
|---|---|---|
| Prisma model | Solid | Soft delete, proper indexes, CITEXT email, FK restrict on loans |
| Zod schemas | Solid | PH phone regex, all enums, partial update, 422 with field errors |
| Router | Solid | RBAC per route, validate middleware wired, thin |
| Controller | Solid | Parse → call service → respond. No business logic leakage |
| Service | Solid | Uniqueness pre-checks, phone normalization, transactions everywhere, audit log in same tx |
| Tests | Good | Happy path + all error cases covered |

---

## Gaps & Improvement Opportunities

### 1. `emergencyContactPhone` not normalized
Phone stored on borrower is normalized to `09XXXXXXXXXX`. Emergency contact phone is validated (PH regex) but not normalized before storage. Inconsistency if searched later.

### 2. No before/after values in audit log
`BORROWER_UPDATED` logs which fields changed (`fields: ["email"]`) but not previous/new values. Useful for financial compliance and debugging.

### 3. Banned user check missing in auth middleware
`requireAuth` attaches `req.user` but does not check `req.user.banned`. A banned user with a valid session can still create/update borrowers. Depends on whether better-auth revokes sessions on ban — worth verifying.

### 4. Dev delay not guarded by `NODE_ENV`
1500ms artificial delay on `GET /` is not wrapped in a `NODE_ENV === 'development'` guard. Risk of shipping to production.

### 5. Race condition on uniqueness checks
Pattern is read → check → write. Concurrent requests can both pass the read check; one then fails at DB constraint (P2002 → mapped to 409). This is handled correctly downstream — no bug, but the optimistic path is present.

### 6. `updateBorrower` allows `idNumber` change on active borrowers
Schema is `createBorrowerSchema.partial()` — any field can be patched including `idNumber`. No guard prevents updating ID on a borrower with active loans, which may be financially significant. Consider locking or at minimum logging old value.

### 7. No active vs. total loan breakdown in list
List returns `_count` (total loans) but no split of active vs. closed. Frontend must infer or make additional fetches.

### 8. No soft-deleted borrower search for admins
`listBorrowers` filters `deletedAt: null` globally. Admins have no way to search or retrieve deleted borrowers. May be intentional.

---

## Priority

| # | Finding | Impact | Effort |
|---|---|---|---|
| 1 | `emergencyContactPhone` not normalized | Data consistency | Low |
| 2 | Banned user check in auth middleware | Security | Low |
| 3 | Dev delay behind `NODE_ENV` guard | Safety | Low |
| 4 | Before/after values in audit log | Compliance | Medium |
| 5 | `idNumber` lock when active loans exist | Business rule | Medium |
| 6 | Loan count breakdown (active vs. total) | UX | Medium |
