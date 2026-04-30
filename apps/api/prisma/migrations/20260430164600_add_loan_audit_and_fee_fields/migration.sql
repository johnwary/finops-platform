-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "canceledById" TEXT,
ADD COLUMN     "disbursedById" TEXT,
ADD COLUMN     "disbursementMethod" "PaymentMethod",
ADD COLUMN     "loanFee" DECIMAL(12,2),
ADD COLUMN     "penaltyRate" DECIMAL(7,4);
