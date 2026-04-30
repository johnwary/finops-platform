-- Partial unique indexes so soft-deleted borrowers don't block reuse of email/idNumber
CREATE UNIQUE INDEX "Borrower_email_unique_active" ON "Borrower" (email) WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "Borrower_idNumber_unique_active" ON "Borrower" ("idNumber") WHERE "deletedAt" IS NULL;
