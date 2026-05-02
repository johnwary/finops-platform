-- remainingBalance is principal-only. Recompute it from recorded principal payments
-- so historical interest, insurance, penalties, and other fee portions no longer
-- reduce outstanding principal in reports.
UPDATE "Loan" AS l
SET "remainingBalance" = CASE
  WHEN l."status" = 'PAID' THEN 0
  ELSE GREATEST(
    l."amount" - COALESCE((
      SELECT SUM(lp."principalPortion")
      FROM "LoanPayment" AS lp
      WHERE lp."loanId" = l."id"
    ), 0),
    0
  )
END;
