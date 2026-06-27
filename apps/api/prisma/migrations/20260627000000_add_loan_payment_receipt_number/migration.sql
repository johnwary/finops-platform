ALTER TABLE "LoanPayment" ADD COLUMN "receiptNumber" TEXT;

WITH numbered_payments AS (
  SELECT
    id,
    'RCPT-' || to_char("createdAt", 'YYYYMMDD') || '-' || lpad(row_number() OVER (ORDER BY "createdAt", id)::text, 6, '0') AS receipt_number
  FROM "LoanPayment"
)
UPDATE "LoanPayment"
SET "receiptNumber" = numbered_payments.receipt_number
FROM numbered_payments
WHERE "LoanPayment".id = numbered_payments.id;

ALTER TABLE "LoanPayment" ALTER COLUMN "receiptNumber" SET NOT NULL;

CREATE UNIQUE INDEX "LoanPayment_receiptNumber_key" ON "LoanPayment"("receiptNumber");
