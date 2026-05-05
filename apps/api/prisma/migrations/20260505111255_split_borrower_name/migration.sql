-- DropIndex
DROP INDEX "Borrower_name_idx";

-- AlterTable: add nullable first, backfill from name, then make NOT NULL, drop name
ALTER TABLE "Borrower"
ADD COLUMN "firstName" TEXT,
ADD COLUMN "middleName" TEXT,
ADD COLUMN "lastName" TEXT;

UPDATE "Borrower" SET "firstName" = name, "lastName" = name;

ALTER TABLE "Borrower"
ALTER COLUMN "firstName" SET NOT NULL,
ALTER COLUMN "lastName" SET NOT NULL;

ALTER TABLE "Borrower" DROP COLUMN "name";

-- CreateIndex
CREATE INDEX "Borrower_lastName_firstName_idx" ON "Borrower"("lastName", "firstName");
