-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "IdType" AS ENUM ('NATIONAL_ID', 'PASSPORT', 'DRIVER_LICENSE');

-- CreateEnum
CREATE TYPE "IncomeSource" AS ENUM ('EMPLOYMENT', 'BUSINESS', 'PENSION', 'OTHER');

-- CreateEnum
CREATE TYPE "LoanType" AS ENUM ('SALARY', 'BUSINESS', 'PERSONAL', 'PURCHASE_ORDER', 'PENSION', 'INVESTMENT');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('PENDING', 'APPROVED', 'ACTIVE', 'PAID', 'CANCELED', 'DEFAULTED');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('SCHEDULED', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PaymentFrequency" AS ENUM ('MONTHLY', 'BIWEEKLY', 'WEEKLY', 'DAILY');

-- CreateEnum
CREATE TYPE "RepaymentStructure" AS ENUM ('AMORTIZING', 'INTEREST_ONLY');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'GCASH', 'CHECK');

-- CreateEnum
CREATE TYPE "DepositType" AS ENUM ('SPECIAL', 'REGULAR');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('ACTIVE', 'WITHDRAWN', 'CLOSED');

-- CreateEnum
CREATE TYPE "DepositPayoutType" AS ENUM ('MATURITY_ONLY', 'SEMI_ANNUAL', 'QUARTERLY', 'MONTHLY_INTEREST');

-- CreateEnum
CREATE TYPE "DepositReturnRatePeriod" AS ENUM ('MONTH', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "BusinessFundStatus" AS ENUM ('ACTIVE', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CapitalFlowType" AS ENUM ('INFLOW', 'OUTFLOW');

-- CreateEnum
CREATE TYPE "CapitalSource" AS ENUM ('BUSINESS_CAPITAL', 'DEPOSIT', 'DEPOSIT_PAYOUT', 'DEPOSIT_WITHDRAWAL', 'LOAN_DISBURSEMENT', 'LOAN_PAYMENT');

-- CreateEnum
CREATE TYPE "ProvisionEventType" AS ENUM ('PROVISION', 'RECOVERY');

-- CreateEnum
CREATE TYPE "ActivityActorType" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ActivityCategory" AS ENUM ('AUDIT', 'ACTIVITY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" TEXT,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "impersonatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Borrower" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneNormalized" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "idType" "IdType" NOT NULL,
    "idNumber" TEXT NOT NULL,
    "occupation" TEXT,
    "incomeSource" "IncomeSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Borrower_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "type" "LoanType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "interestRate" DECIMAL(7,4) NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "paymentFrequency" "PaymentFrequency" NOT NULL DEFAULT 'MONTHLY',
    "repaymentStructure" "RepaymentStructure" NOT NULL DEFAULT 'AMORTIZING',
    "totalPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "remainingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "purpose" TEXT,
    "notes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "disbursedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "defaultedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanPayment" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "principalPortion" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "interestPortion" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "investmentReturn" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "insurance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "penalties" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanInstallment" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "principal" DECIMAL(12,2) NOT NULL,
    "interest" DECIMAL(12,2) NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanProvisionEvent" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "type" "ProvisionEventType" NOT NULL,
    "bucket" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "daysPastDue" INTEGER,
    "basisAmount" DECIMAL(12,2),
    "provisionRate" DECIMAL(7,4),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanProvisionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Depositor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneNormalized" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Depositor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deposit" (
    "id" TEXT NOT NULL,
    "depositorId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "expectedReturnRate" DECIMAL(7,4) NOT NULL,
    "expectedReturnRatePeriod" "DepositReturnRatePeriod" NOT NULL DEFAULT 'MONTH',
    "termMonths" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "DepositStatus" NOT NULL DEFAULT 'ACTIVE',
    "hasBeenWithdrawn" BOOLEAN NOT NULL DEFAULT false,
    "depositType" "DepositType" NOT NULL DEFAULT 'REGULAR',
    "payoutType" "DepositPayoutType" NOT NULL,
    "principalReturned" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPayoutPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "closedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepositPayout" (
    "id" TEXT NOT NULL,
    "depositId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "principalPortion" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "returnPortion" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "PaymentMethod" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepositPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessFund" (
    "id" TEXT NOT NULL,
    "dateAdded" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "remarks" TEXT,
    "status" "BusinessFundStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessFund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapitalEntry" (
    "id" TEXT NOT NULL,
    "flowType" "CapitalFlowType" NOT NULL,
    "source" "CapitalSource" NOT NULL,
    "sourceId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdById" TEXT,
    "reversedAt" TIMESTAMP(3),
    "reversedByEntryId" TEXT,
    "reversalReason" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CapitalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "actorType" "ActivityActorType" NOT NULL DEFAULT 'USER',
    "category" "ActivityCategory" NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Borrower_email_key" ON "Borrower"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Borrower_idNumber_key" ON "Borrower"("idNumber");

-- CreateIndex
CREATE INDEX "Borrower_name_idx" ON "Borrower"("name");

-- CreateIndex
CREATE INDEX "Borrower_phone_idx" ON "Borrower"("phone");

-- CreateIndex
CREATE INDEX "Borrower_phoneNormalized_idx" ON "Borrower"("phoneNormalized");

-- CreateIndex
CREATE INDEX "Borrower_idNumber_idx" ON "Borrower"("idNumber");

-- CreateIndex
CREATE INDEX "Loan_borrowerId_idx" ON "Loan"("borrowerId");

-- CreateIndex
CREATE INDEX "Loan_status_idx" ON "Loan"("status");

-- CreateIndex
CREATE INDEX "Loan_startDate_idx" ON "Loan"("startDate");

-- CreateIndex
CREATE INDEX "Loan_endDate_idx" ON "Loan"("endDate");

-- CreateIndex
CREATE INDEX "Loan_status_disbursedAt_idx" ON "Loan"("status", "disbursedAt");

-- CreateIndex
CREATE INDEX "LoanPayment_loanId_paidAt_idx" ON "LoanPayment"("loanId", "paidAt" DESC);

-- CreateIndex
CREATE INDEX "LoanInstallment_loanId_dueDate_idx" ON "LoanInstallment"("loanId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "LoanInstallment_loanId_sequence_key" ON "LoanInstallment"("loanId", "sequence");

-- CreateIndex
CREATE INDEX "LoanProvisionEvent_loanId_createdAt_idx" ON "LoanProvisionEvent"("loanId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Depositor_email_key" ON "Depositor"("email");

-- CreateIndex
CREATE INDEX "Depositor_name_idx" ON "Depositor"("name");

-- CreateIndex
CREATE INDEX "Depositor_phone_idx" ON "Depositor"("phone");

-- CreateIndex
CREATE INDEX "Depositor_phoneNormalized_idx" ON "Depositor"("phoneNormalized");

-- CreateIndex
CREATE INDEX "Deposit_depositorId_idx" ON "Deposit"("depositorId");

-- CreateIndex
CREATE INDEX "Deposit_status_idx" ON "Deposit"("status");

-- CreateIndex
CREATE INDEX "Deposit_expectedReturnRatePeriod_idx" ON "Deposit"("expectedReturnRatePeriod");

-- CreateIndex
CREATE INDEX "Deposit_termMonths_idx" ON "Deposit"("termMonths");

-- CreateIndex
CREATE INDEX "Deposit_expectedReturnRate_idx" ON "Deposit"("expectedReturnRate");

-- CreateIndex
CREATE INDEX "Deposit_termMonths_expectedReturnRatePeriod_idx" ON "Deposit"("termMonths", "expectedReturnRatePeriod");

-- CreateIndex
CREATE INDEX "Deposit_depositType_idx" ON "Deposit"("depositType");

-- CreateIndex
CREATE INDEX "Deposit_payoutType_idx" ON "Deposit"("payoutType");

-- CreateIndex
CREATE INDEX "DepositPayout_depositId_paidAt_idx" ON "DepositPayout"("depositId", "paidAt" DESC);

-- CreateIndex
CREATE INDEX "BusinessFund_dateAdded_idx" ON "BusinessFund"("dateAdded");

-- CreateIndex
CREATE INDEX "BusinessFund_status_idx" ON "BusinessFund"("status");

-- CreateIndex
CREATE INDEX "CapitalEntry_source_sourceId_idx" ON "CapitalEntry"("source", "sourceId");

-- CreateIndex
CREATE INDEX "CapitalEntry_flowType_idx" ON "CapitalEntry"("flowType");

-- CreateIndex
CREATE INDEX "CapitalEntry_recordedAt_idx" ON "CapitalEntry"("recordedAt" DESC);

-- CreateIndex
CREATE INDEX "CapitalEntry_reversedAt_idx" ON "CapitalEntry"("reversedAt");

-- CreateIndex
CREATE INDEX "CapitalEntry_reversedByEntryId_idx" ON "CapitalEntry"("reversedByEntryId");

-- CreateIndex
CREATE INDEX "CapitalEntry_createdById_idx" ON "CapitalEntry"("createdById");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ActivityLog_actorType_createdAt_idx" ON "ActivityLog"("actorType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ActivityLog_category_createdAt_idx" ON "ActivityLog"("category", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanInstallment" ADD CONSTRAINT "LoanInstallment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanProvisionEvent" ADD CONSTRAINT "LoanProvisionEvent_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_depositorId_fkey" FOREIGN KEY ("depositorId") REFERENCES "Depositor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepositPayout" ADD CONSTRAINT "DepositPayout_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "Deposit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapitalEntry" ADD CONSTRAINT "CapitalEntry_reversedByEntryId_fkey" FOREIGN KEY ("reversedByEntryId") REFERENCES "CapitalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
