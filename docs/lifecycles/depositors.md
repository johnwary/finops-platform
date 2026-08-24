# Depositor lifecycle

Source: `apps/api/src/features/depositors/`.

Depositors are identity and contact records that own deposits. They support create, read, list, update, and admin soft-delete. Deposit creation requires a non-deleted depositor.

Depositor changes do not move capital. Deposit lifecycle behavior, payouts, and financial corrections belong to [deposits.md](deposits.md). Preserve deleted depositors and their linked records for auditability.

Use `depositors.service.test.ts` for duplicate checks, soft-delete rules, and query filtering.
