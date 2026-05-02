CREATE TABLE "LoanPaymentAllocation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "installmentId" TEXT NOT NULL,
    "principalApplied" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "interestApplied" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "penaltiesApplied" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanPaymentAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LoanPaymentAllocation_paymentId_installmentId_key" ON "LoanPaymentAllocation"("paymentId", "installmentId");
CREATE INDEX "LoanPaymentAllocation_paymentId_idx" ON "LoanPaymentAllocation"("paymentId");
CREATE INDEX "LoanPaymentAllocation_installmentId_idx" ON "LoanPaymentAllocation"("installmentId");

ALTER TABLE "LoanPaymentAllocation"
ADD CONSTRAINT "LoanPaymentAllocation_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "LoanPayment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LoanPaymentAllocation"
ADD CONSTRAINT "LoanPaymentAllocation_installmentId_fkey"
FOREIGN KEY ("installmentId") REFERENCES "LoanInstallment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

DO $$
DECLARE
    payment_record RECORD;
    installment_record RECORD;
    remaining_interest DECIMAL(12,2);
    remaining_principal DECIMAL(12,2);
    existing_interest DECIMAL(12,2);
    existing_principal DECIMAL(12,2);
    interest_to_apply DECIMAL(12,2);
    principal_to_apply DECIMAL(12,2);
BEGIN
    FOR payment_record IN
        SELECT "id", "loanId", "interestPortion", "principalPortion"
        FROM "LoanPayment"
        ORDER BY "paidAt", "createdAt", "id"
    LOOP
        remaining_interest := payment_record."interestPortion";
        remaining_principal := payment_record."principalPortion";

        FOR installment_record IN
            SELECT "id", "interest", "principal"
            FROM "LoanInstallment"
            WHERE "loanId" = payment_record."loanId"
            ORDER BY "dueDate", "sequence", "id"
        LOOP
            EXIT WHEN remaining_interest <= 0 AND remaining_principal <= 0;

            SELECT
                COALESCE(SUM("interestApplied"), 0),
                COALESCE(SUM("principalApplied"), 0)
            INTO existing_interest, existing_principal
            FROM "LoanPaymentAllocation"
            WHERE "installmentId" = installment_record."id";

            interest_to_apply := LEAST(
                remaining_interest,
                GREATEST(installment_record."interest" - existing_interest, 0)
            );
            remaining_interest := remaining_interest - interest_to_apply;

            principal_to_apply := LEAST(
                remaining_principal,
                GREATEST(installment_record."principal" - existing_principal, 0)
            );
            remaining_principal := remaining_principal - principal_to_apply;

            IF interest_to_apply > 0 OR principal_to_apply > 0 THEN
                INSERT INTO "LoanPaymentAllocation" (
                    "id",
                    "paymentId",
                    "installmentId",
                    "principalApplied",
                    "interestApplied",
                    "penaltiesApplied",
                    "createdAt"
                )
                VALUES (
                    payment_record."id" || ':' || installment_record."id",
                    payment_record."id",
                    installment_record."id",
                    principal_to_apply,
                    interest_to_apply,
                    0,
                    CURRENT_TIMESTAMP
                );
            END IF;
        END LOOP;
    END LOOP;
END $$;
