-- Development and local records are disposable. Mark all existing loans with
-- the sole supported convention, then prevent unversioned loan contracts.
UPDATE "Loan"
SET "accrualConvention" = 'THIRTY_360'
WHERE "accrualConvention" IS NULL;

ALTER TABLE "Loan"
  ALTER COLUMN "accrualConvention" SET DEFAULT 'THIRTY_360',
  ALTER COLUMN "accrualConvention" SET NOT NULL;
