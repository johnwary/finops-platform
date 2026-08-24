# Borrower lifecycle

Source: `apps/api/src/features/borrowers/`.

Borrowers are KYC records with zero or more loans. They are created, read, listed, updated, soft-deleted, and restored. Admins and managers may create or update; only admins may delete or restore. Deleted records are visible only to admins when requested.

Deletion is a soft delete. A borrower with linked loan history remains recoverable and is not physically removed. Each state-changing operation writes an `ActivityLog` record. Loans remain the financial owner of payment and balance history.

Use `borrowers.service.test.ts` for duplicate detection, query visibility, deletion blocks, and audit behavior.
