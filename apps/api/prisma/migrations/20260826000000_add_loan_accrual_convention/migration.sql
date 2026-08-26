-- Expand only: existing loans retain NULL and continue using their historical
-- schedule algorithm. New loans explicitly persist the 30/360 convention.
CREATE TYPE "LoanAccrualConvention" AS ENUM ('THIRTY_360');

ALTER TABLE "Loan" ADD COLUMN "accrualConvention" "LoanAccrualConvention";
