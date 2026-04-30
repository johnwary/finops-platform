-- AlterTable
ALTER TABLE "Deposit" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "reference" TEXT;

-- CreateIndex
CREATE INDEX "Deposit_deletedAt_idx" ON "Deposit"("deletedAt");
