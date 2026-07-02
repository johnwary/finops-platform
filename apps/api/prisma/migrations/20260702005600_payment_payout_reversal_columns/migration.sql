-- AlterTable
ALTER TABLE "DepositPayout" ADD COLUMN     "reversalReason" TEXT,
ADD COLUMN     "reversedAt" TIMESTAMP(3),
ADD COLUMN     "reversedById" TEXT;

-- AlterTable
ALTER TABLE "LoanPayment" ADD COLUMN     "reversalReason" TEXT,
ADD COLUMN     "reversedAt" TIMESTAMP(3),
ADD COLUMN     "reversedById" TEXT;

-- CreateIndex
CREATE INDEX "DepositPayout_reversedAt_idx" ON "DepositPayout"("reversedAt");

-- CreateIndex
CREATE INDEX "LoanPayment_reversedAt_idx" ON "LoanPayment"("reversedAt");
