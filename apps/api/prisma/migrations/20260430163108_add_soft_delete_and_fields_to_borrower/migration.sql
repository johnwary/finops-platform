-- AlterTable
ALTER TABLE "Borrower" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "monthlyIncome" DECIMAL(12,2),
ADD COLUMN     "notes" TEXT;

-- CreateIndex
CREATE INDEX "Borrower_deletedAt_idx" ON "Borrower"("deletedAt");
