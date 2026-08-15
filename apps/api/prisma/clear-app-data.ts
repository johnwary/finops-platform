import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const PRESERVED_TABLES = ['User', 'Account'] as const;
const LOCAL_DB_HOSTS = ['localhost', '127.0.0.1'];

const args = new Set(process.argv.slice(2));
const shouldDelete = args.has('--yes');
const allowProduction = args.has('--allow-production');
const confirmedDbName = process.argv.find((arg) => arg.startsWith('--confirm-db='))?.slice('--confirm-db='.length);

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const dbHost = new URL(databaseUrl).hostname;
const dbName = new URL(databaseUrl).pathname.replace(/^\//, '');
const isLocalDb = LOCAL_DB_HOSTS.includes(dbHost);

if (!isLocalDb) {
  if (!allowProduction) {
    console.error(
      `Refusing to clear data: DATABASE_URL points at non-local host "${dbHost}". Pass --allow-production to override.`,
    );
    process.exit(1);
  }
  if (confirmedDbName !== dbName) {
    console.error(
      `--allow-production requires --confirm-db=${dbName} (typed DB name) to proceed against a non-local host.`,
    );
    process.exit(1);
  }
}

const adapter = new PrismaPg(databaseUrl);
const prisma = new PrismaClient({ adapter });

type CountMap = Record<string, number>;

async function getCounts(): Promise<CountMap> {
  const [
    invitations,
    activityLogs,
    loanPaymentAllocations,
    loanPayments,
    loanInstallments,
    loanProvisionEvents,
    loans,
    borrowers,
    depositPayouts,
    deposits,
    depositors,
    capitalEntries,
    businessFunds,
    users,
    accounts,
    sessions,
    verifications,
  ] = await Promise.all([
    prisma.invitation.count(),
    prisma.activityLog.count(),
    prisma.loanPaymentAllocation.count(),
    prisma.loanPayment.count(),
    prisma.loanInstallment.count(),
    prisma.loanProvisionEvent.count(),
    prisma.loan.count(),
    prisma.borrower.count(),
    prisma.depositPayout.count(),
    prisma.deposit.count(),
    prisma.depositor.count(),
    prisma.capitalEntry.count(),
    prisma.businessFund.count(),
    prisma.user.count(),
    prisma.account.count(),
    prisma.session.count(),
    prisma.verification.count(),
  ]);

  return {
    Invitation: invitations,
    ActivityLog: activityLogs,
    LoanPaymentAllocation: loanPaymentAllocations,
    LoanPayment: loanPayments,
    LoanInstallment: loanInstallments,
    LoanProvisionEvent: loanProvisionEvents,
    Loan: loans,
    Borrower: borrowers,
    DepositPayout: depositPayouts,
    Deposit: deposits,
    Depositor: depositors,
    CapitalEntry: capitalEntries,
    BusinessFund: businessFunds,
    User: users,
    Account: accounts,
    Session: sessions,
    Verification: verifications,
  };
}

function printCounts(title: string, counts: CountMap) {
  console.log(`\n${title}`);
  for (const [table, count] of Object.entries(counts)) {
    const preserved = PRESERVED_TABLES.includes(table as (typeof PRESERVED_TABLES)[number])
      ? ' (preserved)'
      : '';
    console.log(`${table.padEnd(24)} ${String(count).padStart(6)}${preserved}`);
  }
}

async function clearAppData() {
  return prisma.$transaction(
    async (tx) => {
      await tx.capitalEntry.updateMany({ data: { reversedByEntryId: null } });

      const deleted = {
        Invitation: await tx.invitation.deleteMany(),
        ActivityLog: await tx.activityLog.deleteMany(),
        Verification: await tx.verification.deleteMany(),
        Session: await tx.session.deleteMany(),
        LoanPaymentAllocation: await tx.loanPaymentAllocation.deleteMany(),
        LoanPayment: await tx.loanPayment.deleteMany(),
        LoanInstallment: await tx.loanInstallment.deleteMany(),
        LoanProvisionEvent: await tx.loanProvisionEvent.deleteMany(),
        Loan: await tx.loan.deleteMany(),
        Borrower: await tx.borrower.deleteMany(),
        DepositPayout: await tx.depositPayout.deleteMany(),
        Deposit: await tx.deposit.deleteMany(),
        Depositor: await tx.depositor.deleteMany(),
        CapitalEntry: await tx.capitalEntry.deleteMany(),
        BusinessFund: await tx.businessFund.deleteMany(),
      };

      return Object.fromEntries(
        Object.entries(deleted).map(([table, result]) => [table, result.count]),
      ) as CountMap;
    },
    { timeout: 30_000 },
  );
}

async function main() {
  const before = await getCounts();
  printCounts('Current data', before);

  console.log(`\nPreserving account tables: ${PRESERVED_TABLES.join(', ')}`);

  if (!shouldDelete) {
    console.log('\nDry run only. Re-run with --yes to delete non-account data.');
    return;
  }

  const deleted = await clearAppData();
  printCounts('Deleted rows', deleted);

  const after = await getCounts();
  printCounts('Remaining data', after);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
