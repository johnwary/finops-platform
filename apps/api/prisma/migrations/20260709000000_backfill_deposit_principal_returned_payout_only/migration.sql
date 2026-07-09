-- Data backfill, no schema change.
--
-- withdrawDeposit/closeDeposit used to clobber "principalReturned" to the full
-- deposit amount at termination. The column means "principal returned via
-- payouts only" (the terminal principal return is a CapitalEntry, not a payout).
-- Recompute the payout-only value for already-terminated deposits from their
-- non-reversed payouts.
UPDATE "Deposit" AS d
SET "principalReturned" = COALESCE((
  SELECT SUM(p."principalPortion")
  FROM "DepositPayout" AS p
  WHERE p."depositId" = d."id"
    AND p."reversedAt" IS NULL
), 0)
WHERE d."status" IN ('WITHDRAWN', 'CLOSED');
