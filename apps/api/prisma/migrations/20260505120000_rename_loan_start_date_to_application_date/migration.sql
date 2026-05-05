ALTER TABLE "Loan" RENAME COLUMN "startDate" TO "applicationDate";

DROP INDEX IF EXISTS "Loan_startDate_idx";
CREATE INDEX "Loan_applicationDate_idx" ON "Loan"("applicationDate");
