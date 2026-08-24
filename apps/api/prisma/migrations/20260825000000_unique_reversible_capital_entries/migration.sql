-- Reversible payment sources must each map to exactly one capital entry.
-- Rollback: DROP INDEX "CapitalEntry_reversible_source_sourceId_key";
CREATE UNIQUE INDEX "CapitalEntry_reversible_source_sourceId_key"
ON "CapitalEntry"("source", "sourceId")
WHERE "sourceId" IS NOT NULL
  AND "source" IN ('LOAN_PAYMENT', 'DEPOSIT_PAYOUT');
