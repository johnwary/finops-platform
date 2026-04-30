-- DropIndex
DROP INDEX "Depositor_email_key";

-- AlterTable
ALTER TABLE "Depositor" ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "idNumber" TEXT,
ADD COLUMN     "idType" "IdType",
ADD COLUMN     "notes" TEXT;

-- CreateIndex
CREATE INDEX "Depositor_idNumber_idx" ON "Depositor"("idNumber");

-- CreateIndex
CREATE INDEX "Depositor_deletedAt_idx" ON "Depositor"("deletedAt");
