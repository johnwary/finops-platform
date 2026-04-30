import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { addMonths, addWeeks, subMonths, subDays } from 'date-fns';
import { Decimal } from '@prisma/client/runtime/client';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaPg(process.env.DATABASE_URL ?? '');
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL    = (process.env.SEED_ADMIN_EMAIL    ?? 'admin@example.com').toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD  ?? 'changeme123';
const ADMIN_NAME     = process.env.SEED_ADMIN_NAME      ?? 'Super Admin';

// ── helpers ──────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('63') && digits.length === 12) return '0' + digits.slice(2);
  if (digits.length === 10) return '0' + digits;
  return digits;
}

// PH-flavored fake data pools
const FIRST_NAMES = ['Maria', 'Jose', 'Ana', 'Juan', 'Rosa', 'Ramon', 'Luz', 'Eduardo', 'Carmen', 'Antonio', 'Lourdes', 'Fernando', 'Cecilia', 'Roberto', 'Gloria', 'Manuel', 'Corazon', 'Ricardo', 'Teresita', 'Danilo'];
const LAST_NAMES  = ['Santos', 'Reyes', 'Cruz', 'Garcia', 'Ramos', 'Flores', 'Torres', 'Rivera', 'Bautista', 'Dela Cruz', 'Lopez', 'Gonzales', 'Hernandez', 'Soriano', 'Villanueva', 'Mendoza', 'Aquino', 'Castillo', 'Magno', 'Pascual'];
const CITIES      = ['Manila', 'Quezon City', 'Caloocan', 'Davao', 'Cebu', 'Zamboanga', 'Antipolo', 'Taguig', 'Pasig', 'Cagayan de Oro'];
const BARANGAYS   = ['Barangay 1', 'Barangay 5', 'Barangay 10', 'Poblacion', 'San Antonio', 'Santa Cruz', 'Bagong Silang', 'Maynila'];

function fakeName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

function fakeEmail(name: string, suffix: number) {
  return `${name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '')}.${suffix}@example.com`;
}

function fakePhone() {
  return `09${randomInt(100000000, 999999999)}`;
}

function fakeAddress() {
  return `${randomInt(1, 999)} ${pick(BARANGAYS)}, ${pick(CITIES)}`;
}

function fakeDOB() {
  const year = randomInt(1960, 1995);
  const month = randomInt(0, 11);
  const day = randomInt(1, 28);
  return new Date(year, month, day);
}

// Amortizing PMT
function pmt(principal: number, rate: number, n: number): number {
  if (rate === 0) return principal / n;
  return (principal * rate) / (1 - Math.pow(1 + rate, -n));
}

// ── seed functions ────────────────────────────────────────────────────────────

async function seedAdmin() {
  const hashed = await hashPassword(ADMIN_PASSWORD);

  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: 'admin', emailVerified: true },
    create: {
      id: randomUUID(),
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: 'admin',
      emailVerified: true,
    },
  });

  const account = await prisma.account.findFirst({
    where: { providerId: 'credential', accountId: ADMIN_EMAIL },
  });

  if (account) {
    await prisma.account.update({
      where: { id: account.id },
      data: { userId: user.id, password: hashed },
    });
  } else {
    await prisma.account.create({
      data: {
        id: randomUUID(),
        accountId: ADMIN_EMAIL,
        providerId: 'credential',
        userId: user.id,
        password: hashed,
      },
    });
  }

  console.log(`✓ Admin: ${ADMIN_EMAIL}`);
  return user;
}

async function seedBorrowersAndLoans(adminId: string) {
  const borrowerData = Array.from({ length: 20 }, (_, i) => {
    const name = fakeName();
    return {
      id: randomUUID(),
      name,
      email: fakeEmail(name, i + 1),
      phone: fakePhone(),
      address: fakeAddress(),
      dateOfBirth: fakeDOB(),
      gender: pick(['MALE', 'FEMALE'] as const),
      idType: pick(['NATIONAL_ID', 'PASSPORT', 'DRIVER_LICENSE'] as const),
      idNumber: `ID-${randomInt(100000, 999999)}`,
      incomeSource: pick(['EMPLOYMENT', 'BUSINESS', 'PENSION', 'OTHER'] as const),
      occupation: pick(['Teacher', 'Driver', 'Vendor', 'Nurse', 'Farmer', null, null]),
      monthlyIncome: new Decimal(randomInt(8000, 60000)),
      notes: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
    };
  });

  const borrowers = await Promise.all(
    borrowerData.map((b) =>
      prisma.borrower.upsert({
        where: { id: b.id },
        update: {},
        create: {
          ...b,
          phoneNormalized: normalizePhone(b.phone),
        },
      }),
    ),
  );

  console.log(`✓ Borrowers: ${borrowers.length}`);

  // Create loans in various states to populate dashboard meaningfully
  const loanSeeds: Array<{
    borrower: (typeof borrowers)[0];
    status: 'PENDING' | 'APPROVED' | 'ACTIVE' | 'PAID' | 'DEFAULTED' | 'CANCELED';
    monthsAgo: number;
    termMonths: number;
    amount: number;
    makePayments?: boolean;
    makeOverdue?: boolean;
  }> = [
    // ACTIVE loans — bulk of portfolio
    ...borrowers.slice(0, 8).map((b, i) => ({
      borrower: b,
      status: 'ACTIVE' as const,
      monthsAgo: randomInt(2, 8),
      termMonths: pick([6, 12, 18, 24]),
      amount: randomInt(10000, 100000),
      makePayments: true,
      makeOverdue: i < 3, // first 3 have overdue installments
    })),
    // PAID loans
    ...borrowers.slice(8, 12).map((b) => ({
      borrower: b,
      status: 'PAID' as const,
      monthsAgo: randomInt(10, 18),
      termMonths: 12,
      amount: randomInt(10000, 50000),
      makePayments: false,
    })),
    // DEFAULTED
    ...borrowers.slice(12, 14).map((b) => ({
      borrower: b,
      status: 'DEFAULTED' as const,
      monthsAgo: randomInt(8, 14),
      termMonths: 12,
      amount: randomInt(20000, 80000),
    })),
    // PENDING
    ...borrowers.slice(14, 17).map((b) => ({
      borrower: b,
      status: 'PENDING' as const,
      monthsAgo: 0,
      termMonths: pick([6, 12]),
      amount: randomInt(10000, 50000),
    })),
    // APPROVED
    ...borrowers.slice(17, 19).map((b) => ({
      borrower: b,
      status: 'APPROVED' as const,
      monthsAgo: 0,
      termMonths: 12,
      amount: randomInt(20000, 60000),
    })),
    // CANCELED
    { borrower: borrowers[19]!, status: 'CANCELED' as const, monthsAgo: 3, termMonths: 6, amount: 15000 },
  ];

  for (const seed of loanSeeds) {
    const startDate = subMonths(new Date(), seed.monthsAgo);
    const endDate = addMonths(startDate, seed.termMonths);
    const rate = 0.03; // 3% monthly
    const loanId = randomUUID();

    const loanData: Parameters<typeof prisma.loan.create>[0]['data'] = {
      id: loanId,
      borrowerId: seed.borrower.id,
      type: pick(['SALARY', 'BUSINESS', 'PERSONAL'] as const),
      amount: new Decimal(seed.amount),
      interestRate: new Decimal(rate),
      termMonths: seed.termMonths,
      startDate,
      endDate,
      paymentFrequency: 'MONTHLY',
      repaymentStructure: 'AMORTIZING',
      remainingBalance: new Decimal(seed.amount),
      loanFee: new Decimal(randomInt(200, 1000)),
      purpose: pick(['Business capital', 'Home improvement', 'Education', 'Medical', 'Personal']),
    };

    // Set status-specific fields
    if (['ACTIVE', 'PAID', 'DEFAULTED'].includes(seed.status)) {
      loanData.status = seed.status;
      loanData.approvedAt = subDays(startDate, 3);
      loanData.approvedById = adminId;
      loanData.disbursedAt = startDate;
      loanData.disbursedById = adminId;
      loanData.disbursementMethod = 'CASH';
    } else if (seed.status === 'APPROVED') {
      loanData.status = 'APPROVED';
      loanData.approvedAt = new Date();
      loanData.approvedById = adminId;
    } else if (seed.status === 'CANCELED') {
      loanData.status = 'CANCELED';
      loanData.canceledAt = subMonths(new Date(), 2);
      loanData.canceledById = adminId;
      loanData.cancellationReason = 'Borrower withdrew application';
    }

    if (seed.status === 'DEFAULTED') {
      loanData.defaultedAt = subMonths(new Date(), 1);
    }
    if (seed.status === 'PAID') {
      loanData.paidAt = subMonths(new Date(), 1);
      loanData.totalPaid = new Decimal(seed.amount * 1.18); // rough total with interest
      loanData.remainingBalance = new Decimal(0);
    }

    await prisma.loan.upsert({
      where: { id: loanId },
      update: {},
      create: loanData,
    });

    // Generate installments for disbursed loans
    if (['ACTIVE', 'DEFAULTED'].includes(seed.status)) {
      const installmentCount = seed.termMonths;
      const monthlyPmt = pmt(seed.amount, rate, installmentCount);
      let balance = seed.amount;

      const installments = Array.from({ length: installmentCount }, (_, i) => {
        const dueDate = addMonths(startDate, i + 1);
        const interestDue = balance * rate;
        const principalDue = Math.min(monthlyPmt - interestDue, balance);
        balance -= principalDue;

        let status: 'SCHEDULED' | 'PAID' | 'OVERDUE' = 'SCHEDULED';
        if (seed.makeOverdue && dueDate < subDays(new Date(), 30) && i < 2) {
          status = 'OVERDUE';
        } else if (seed.makePayments && dueDate < new Date()) {
          status = 'PAID';
        }

        return {
          id: randomUUID(),
          loanId,
          sequence: i + 1,
          dueDate,
          principal: new Decimal(principalDue).toDecimalPlaces(2),
          interest: new Decimal(interestDue).toDecimalPlaces(2),
          status,
        };
      });

      await prisma.loanInstallment.createMany({
        data: installments,
        skipDuplicates: true,
      });

      // Record some payments for ACTIVE loans
      if (seed.makePayments && !seed.makeOverdue) {
        const paidInstallments = installments.filter((i) => i.status === 'PAID');
        let totalPaid = new Decimal(0);
        let totalPrincipal = new Decimal(0);

        for (const inst of paidInstallments) {
          const paymentAmount = inst.principal.plus(inst.interest);
          totalPaid = totalPaid.plus(paymentAmount);
          totalPrincipal = totalPrincipal.plus(inst.principal);

          await prisma.loanPayment.create({
            data: {
              id: randomUUID(),
              loanId,
              amount: paymentAmount,
              principalPortion: inst.principal,
              interestPortion: inst.interest,
              paidAt: inst.dueDate,
              method: 'CASH',
            },
          });

          await prisma.capitalEntry.create({
            data: {
              flowType: 'INFLOW',
              source: 'LOAN_PAYMENT',
              sourceId: loanId,
              amount: paymentAmount,
              description: `Loan payment - installment ${inst.sequence}`,
              createdById: adminId,
              recordedAt: inst.dueDate,
            },
          });
        }

        // Update loan balance
        const remaining = new Decimal(seed.amount).minus(totalPrincipal);
        await prisma.loan.update({
          where: { id: loanId },
          data: { totalPaid, remainingBalance: remaining.greaterThan(0) ? remaining : new Decimal(0) },
        });
      }

      // Capital outflow for disbursement
      await prisma.capitalEntry.create({
        data: {
          flowType: 'OUTFLOW',
          source: 'LOAN_DISBURSEMENT',
          sourceId: loanId,
          amount: new Decimal(seed.amount),
          description: `Loan disbursed to ${seed.borrower.name}`,
          createdById: adminId,
          recordedAt: startDate,
        },
      });

      // Provision event for defaulted loans
      if (seed.status === 'DEFAULTED') {
        await prisma.loanProvisionEvent.create({
          data: {
            loanId,
            type: 'PROVISION',
            bucket: 3,
            daysPastDue: 120,
            basisAmount: new Decimal(seed.amount),
            provisionRate: new Decimal(0.25),
            amount: new Decimal(seed.amount * 0.25).toDecimalPlaces(2),
            reason: 'Auto-defaulted — DPD 120, bucket 3',
          },
        });
      }
    }
  }

  console.log(`✓ Loans: ${loanSeeds.length}`);
}

async function seedDepositorsAndDeposits(adminId: string) {
  const depositorData = Array.from({ length: 10 }, (_, i) => {
    const name = fakeName();
    return {
      id: randomUUID(),
      name,
      email: fakeEmail(name, i + 100),
      phone: fakePhone(),
      address: fakeAddress(),
      dateOfBirth: fakeDOB(),
      idType: pick(['NATIONAL_ID', 'PASSPORT', 'DRIVER_LICENSE'] as const),
      idNumber: `DEP-${randomInt(100000, 999999)}`,
      notes: null,
    };
  });

  const depositors = await Promise.all(
    depositorData.map((d) =>
      prisma.depositor.upsert({
        where: { id: d.id },
        update: {},
        create: {
          ...d,
          phoneNormalized: normalizePhone(d.phone),
        },
      }),
    ),
  );

  console.log(`✓ Depositors: ${depositors.length}`);

  const depositSeeds: Array<{
    depositor: (typeof depositors)[0];
    status: 'ACTIVE' | 'WITHDRAWN' | 'CLOSED';
    monthsAgo: number;
    termMonths: number;
    amount: number;
    payoutType: 'MATURITY_ONLY' | 'SEMI_ANNUAL' | 'QUARTERLY' | 'MONTHLY_INTEREST';
  }> = [
    // ACTIVE deposits — bulk
    ...depositors.slice(0, 6).map((d) => ({
      depositor: d,
      status: 'ACTIVE' as const,
      monthsAgo: randomInt(1, 6),
      termMonths: pick([6, 12, 24]),
      amount: randomInt(50000, 500000),
      payoutType: pick(['MATURITY_ONLY', 'QUARTERLY', 'MONTHLY_INTEREST'] as const),
    })),
    // CLOSED (matured)
    ...depositors.slice(6, 8).map((d) => ({
      depositor: d,
      status: 'CLOSED' as const,
      monthsAgo: 14,
      termMonths: 12,
      amount: randomInt(100000, 300000),
      payoutType: 'MATURITY_ONLY' as const,
    })),
    // WITHDRAWN
    ...depositors.slice(8, 10).map((d) => ({
      depositor: d,
      status: 'WITHDRAWN' as const,
      monthsAgo: 8,
      termMonths: 12,
      amount: randomInt(50000, 150000),
      payoutType: 'MATURITY_ONLY' as const,
    })),
  ];

  for (const seed of depositSeeds) {
    const startDate = subMonths(new Date(), seed.monthsAgo);
    const endDate = addMonths(startDate, seed.termMonths);
    const depositId = randomUUID();
    const rate = pick([0.05, 0.06, 0.07, 0.08]);

    await prisma.deposit.upsert({
      where: { id: depositId },
      update: {},
      create: {
        id: depositId,
        depositorId: seed.depositor.id,
        amount: new Decimal(seed.amount),
        expectedReturnRate: new Decimal(rate),
        expectedReturnRatePeriod: 'MONTH',
        termMonths: seed.termMonths,
        startDate,
        endDate,
        status: seed.status,
        depositType: 'REGULAR',
        payoutType: seed.payoutType,
        hasBeenWithdrawn: seed.status === 'WITHDRAWN',
        withdrawnAt: seed.status === 'WITHDRAWN' ? subMonths(new Date(), 1) : null,
        closedAt: seed.status === 'CLOSED' ? subMonths(new Date(), 1) : null,
      },
    });

    // Capital inflow for all deposits
    await prisma.capitalEntry.create({
      data: {
        flowType: 'INFLOW',
        source: 'DEPOSIT',
        sourceId: depositId,
        amount: new Decimal(seed.amount),
        description: `Deposit received from ${seed.depositor.name}`,
        createdById: adminId,
        recordedAt: startDate,
      },
    });

    // Capital outflow for closed/withdrawn deposits
    if (seed.status === 'CLOSED' || seed.status === 'WITHDRAWN') {
      await prisma.capitalEntry.create({
        data: {
          flowType: 'OUTFLOW',
          source: 'DEPOSIT_WITHDRAWAL',
          sourceId: depositId,
          amount: new Decimal(seed.amount),
          description: `Deposit ${seed.status.toLowerCase()} — principal returned to ${seed.depositor.name}`,
          createdById: adminId,
          recordedAt: subMonths(new Date(), 1),
        },
      });
    }

    // Monthly payouts for ACTIVE MONTHLY_INTEREST deposits
    if (seed.status === 'ACTIVE' && seed.payoutType === 'MONTHLY_INTEREST') {
      const monthsPaid = Math.max(1, seed.monthsAgo - 1);
      const monthlyReturn = seed.amount * rate;
      let totalPayoutPaid = new Decimal(0);

      for (let i = 0; i < monthsPaid; i++) {
        const paidAt = addMonths(startDate, i + 1);
        if (paidAt > new Date()) break;

        const payoutAmount = new Decimal(monthlyReturn).toDecimalPlaces(2);
        totalPayoutPaid = totalPayoutPaid.plus(payoutAmount);

        await prisma.depositPayout.create({
          data: {
            depositId,
            amount: payoutAmount,
            returnPortion: payoutAmount,
            paidAt,
            method: 'BANK_TRANSFER',
          },
        });

        await prisma.capitalEntry.create({
          data: {
            flowType: 'OUTFLOW',
            source: 'DEPOSIT_PAYOUT',
            sourceId: depositId,
            amount: payoutAmount,
            description: `Monthly interest payout for deposit ${depositId}`,
            createdById: adminId,
            recordedAt: paidAt,
          },
        });
      }

      if (totalPayoutPaid.greaterThan(0)) {
        await prisma.deposit.update({
          where: { id: depositId },
          data: { totalPayoutPaid },
        });
      }
    }
  }

  console.log(`✓ Deposits: ${depositSeeds.length}`);
}

async function seedBusinessFunds(adminId: string) {
  const funds = [
    { dateAdded: subMonths(new Date(), 12), amount: 500000, remarks: 'Initial business capital' },
    { dateAdded: subMonths(new Date(), 6),  amount: 200000, remarks: 'Capital top-up Q2' },
    { dateAdded: subMonths(new Date(), 2),  amount: 150000, remarks: 'Capital top-up Q4' },
  ];

  for (const f of funds) {
    await prisma.businessFund.create({
      data: { dateAdded: f.dateAdded, amount: new Decimal(f.amount), remarks: f.remarks },
    });

    await prisma.capitalEntry.create({
      data: {
        flowType: 'INFLOW',
        source: 'BUSINESS_CAPITAL',
        amount: new Decimal(f.amount),
        description: f.remarks,
        createdById: adminId,
        recordedAt: f.dateAdded,
      },
    });
  }

  console.log(`✓ Business funds: ${funds.length}`);
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding database...\n');

  const admin = await seedAdmin();
  await seedBorrowersAndLoans(admin.id);
  await seedDepositorsAndDeposits(admin.id);
  await seedBusinessFunds(admin.id);

  console.log('\nDone.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
