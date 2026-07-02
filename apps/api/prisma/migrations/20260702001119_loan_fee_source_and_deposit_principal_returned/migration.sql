-- AlterEnum
ALTER TYPE "CapitalSource" ADD VALUE 'LOAN_FEE';

-- Backfill: terminal deposits have their full principal returned. Earlier code
-- only incremented principalReturned on payouts, leaving WITHDRAWN/CLOSED rows
-- understated.
UPDATE "Deposit"
SET "principalReturned" = "amount"
WHERE "status" IN ('WITHDRAWN', 'CLOSED')
  AND "principalReturned" < "amount";
