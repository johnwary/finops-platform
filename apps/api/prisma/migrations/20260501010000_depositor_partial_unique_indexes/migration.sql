-- Partial unique index so soft-deleted depositors don't block reuse of email
CREATE UNIQUE INDEX "Depositor_email_unique_active" ON "Depositor" (email) WHERE "deletedAt" IS NULL;
