import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from 'better-auth/crypto';
import { addMonths, subDays, subMonths } from 'date-fns';
import { Decimal } from '@prisma/client/runtime/client';
import { PrismaClient } from '../src/generated/prisma/client.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const adapter = new PrismaPg(databaseUrl);
const prisma = new PrismaClient({ adapter });

const ADMIN_ID = 'seed-user-admin';
const STAFF_ID = 'seed-user-staff';
const ADMIN_ACCOUNT_ID = 'seed-account-admin';
const STAFF_ACCOUNT_ID = 'seed-account-staff';

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com').toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'changeme123';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? 'Super Admin';

const STAFF_EMAIL = (process.env.SEED_STAFF_EMAIL ?? 'staff@example.com').toLowerCase();
const STAFF_PASSWORD = process.env.SEED_STAFF_PASSWORD ?? 'changeme123';
const STAFF_NAME = process.env.SEED_STAFF_NAME ?? 'Operations Staff';

const BORROWER_IDS = {
  clean: 'seed-borrower-clean',
  pending: 'seed-borrower-pending',
  approved: 'seed-borrower-approved',
  activeFresh: 'seed-borrower-active-fresh',
  activePartial: 'seed-borrower-active-partial',
  defaulted: 'seed-borrower-defaulted',
} as const;

const LOAN_IDS = {
  pending: 'seed-loan-pending',
  approved: 'seed-loan-approved',
  activeFresh: 'seed-loan-active-fresh',
  activePartial: 'seed-loan-active-partial',
  defaulted: 'seed-loan-defaulted',
} as const;

const DEPOSITOR_IDS = {
  clean: 'seed-depositor-clean',
  active: 'seed-depositor-active',
  payout: 'seed-depositor-payout',
  closed: 'seed-depositor-closed',
} as const;

const DEPOSIT_IDS = {
  active: 'seed-deposit-active',
  payout: 'seed-deposit-payout',
  closed: 'seed-deposit-closed',
} as const;

const BUSINESS_FUND_IDS = {
  initial: 'seed-business-fund-initial',
  topUp: 'seed-business-fund-top-up',
} as const;

const loanIds = Object.values(LOAN_IDS);
const depositorIds = Object.values(DEPOSITOR_IDS);
const depositIds = Object.values(DEPOSIT_IDS);
const businessFundIds = Object.values(BUSINESS_FUND_IDS);

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('63') && digits.length === 12) return '0' + digits.slice(2);
  if (digits.length === 10) return '0' + digits;
  return digits;
}

function money(value: number | string): Decimal {
  return new Decimal(value).toDecimalPlaces(2);
}

function rate(value: number | string): Decimal {
  return new Decimal(value);
}

function installmentPayment(principal: number, monthlyRate: number, termMonths: number): number {
  if (monthlyRate === 0) return principal / termMonths;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));
}

function buildMonthlyInstallments({
  loanId,
  principal,
  monthlyRate,
  termMonths,
  startDate,
  statusForSequence = {},
}: {
  loanId: string;
  principal: number;
  monthlyRate: number;
  termMonths: number;
  startDate: Date;
  statusForSequence?: Record<number, 'SCHEDULED' | 'PAID' | 'OVERDUE'>;
}) {
  let balance = principal;
  const payment = installmentPayment(principal, monthlyRate, termMonths);

  return Array.from({ length: termMonths }, (_, index) => {
    const sequence = index + 1;
    const interest = balance * monthlyRate;
    const principalPortion = Math.min(payment - interest, balance);
    balance -= principalPortion;

    return {
      id: `${loanId}-inst-${String(sequence).padStart(2, '0')}`,
      loanId,
      sequence,
      dueDate: addMonths(startDate, sequence),
      principal: money(principalPortion),
      interest: money(interest),
      status: statusForSequence[sequence] ?? 'SCHEDULED',
    };
  });
}

async function upsertCredentialAccount({
  id,
  userId,
  email,
  password,
}: {
  id: string;
  userId: string;
  email: string;
  password: string;
}) {
  const hashed = await hashPassword(password);
  const existing = await prisma.account.findFirst({
    where: { providerId: 'credential', accountId: email },
  });

  if (existing) {
    await prisma.account.update({
      where: { id: existing.id },
      data: { userId, password: hashed },
    });
    return;
  }

  await prisma.account.create({
    data: {
      id,
      userId,
      accountId: email,
      providerId: 'credential',
      password: hashed,
    },
  });
}

async function resetSeedOwnedRows() {
  await prisma.$transaction(async (tx) => {
    const existingSeedPayments = await tx.loanPayment.findMany({
      where: { loanId: { in: loanIds } },
      select: { id: true },
    });
    const existingSeedPayouts = await tx.depositPayout.findMany({
      where: { depositId: { in: depositIds } },
      select: { id: true },
    });
    const paymentIds = existingSeedPayments.map((payment) => payment.id);
    const payoutIds = existingSeedPayouts.map((payout) => payout.id);

    await tx.loanPaymentAllocation.deleteMany({
      where: { payment: { loanId: { in: loanIds } } },
    });
    await tx.loanPayment.deleteMany({ where: { loanId: { in: loanIds } } });
    await tx.loanInstallment.deleteMany({ where: { loanId: { in: loanIds } } });
    await tx.loanProvisionEvent.deleteMany({ where: { loanId: { in: loanIds } } });
    await tx.depositPayout.deleteMany({ where: { depositId: { in: depositIds } } });
    await tx.deposit.deleteMany({ where: { id: { in: depositIds } } });
    await tx.depositor.deleteMany({ where: { id: { in: depositorIds } } });
    await tx.capitalEntry.deleteMany({
      where: {
        OR: [
          { id: { startsWith: 'seed-capital-' } },
          {
            sourceId: {
              in: [...loanIds, ...paymentIds, ...depositIds, ...payoutIds, ...businessFundIds],
            },
          },
        ],
      },
    });
    await tx.activityLog.deleteMany({
      where: {
        OR: [
          { id: { startsWith: 'seed-activity-' } },
          { targetId: { in: [...loanIds, ...depositIds] } },
        ],
      },
    });
  });
}

async function seedUsers() {
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: ADMIN_NAME,
      role: 'admin',
      emailVerified: true,
      banned: false,
    },
    create: {
      id: ADMIN_ID,
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: 'admin',
      emailVerified: true,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: STAFF_EMAIL },
    update: {
      name: STAFF_NAME,
      role: 'user',
      emailVerified: true,
      banned: false,
    },
    create: {
      id: STAFF_ID,
      email: STAFF_EMAIL,
      name: STAFF_NAME,
      role: 'user',
      emailVerified: true,
    },
  });

  await upsertCredentialAccount({
    id: ADMIN_ACCOUNT_ID,
    userId: admin.id,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  await upsertCredentialAccount({
    id: STAFF_ACCOUNT_ID,
    userId: staff.id,
    email: STAFF_EMAIL,
    password: STAFF_PASSWORD,
  });

  console.log(`Users: ${ADMIN_EMAIL} (admin), ${STAFF_EMAIL} (user)`);
  return { admin, staff };
}

async function seedBorrowersAndLoans(adminId: string) {
  const today = new Date();
  const borrowers = [
    {
      id: BORROWER_IDS.clean,
      firstName: 'Ana',
      middleName: null,
      lastName: 'Santos',
      email: 'ana.santos.seed@example.com',
      phone: '09170000001',
      address: '101 Poblacion, Manila',
      dateOfBirth: new Date('1988-03-14'),
      gender: 'FEMALE' as const,
      idType: 'NATIONAL_ID' as const,
      idNumber: 'SEED-BOR-001',
      occupation: 'Teacher',
      incomeSource: 'EMPLOYMENT' as const,
      monthlyIncome: money(42000),
      notes: 'Workflow seed: borrower profile without loans.',
    },
    {
      id: BORROWER_IDS.pending,
      firstName: 'Jose',
      middleName: null,
      lastName: 'Reyes',
      email: 'jose.reyes.seed@example.com',
      phone: '09170000002',
      address: '22 San Antonio, Quezon City',
      dateOfBirth: new Date('1982-08-09'),
      gender: 'MALE' as const,
      idType: 'DRIVER_LICENSE' as const,
      idNumber: 'SEED-BOR-002',
      occupation: 'Delivery Driver',
      incomeSource: 'EMPLOYMENT' as const,
      monthlyIncome: money(36000),
      notes: 'Workflow seed: pending loan approval.',
    },
    {
      id: BORROWER_IDS.approved,
      firstName: 'Maria',
      middleName: null,
      lastName: 'Cruz',
      email: 'maria.cruz.seed@example.com',
      phone: '09170000003',
      address: '88 Santa Cruz, Pasig',
      dateOfBirth: new Date('1990-11-21'),
      gender: 'FEMALE' as const,
      idType: 'PASSPORT' as const,
      idNumber: 'SEED-BOR-003',
      occupation: 'Online Seller',
      incomeSource: 'BUSINESS' as const,
      monthlyIncome: money(58000),
      notes: 'Workflow seed: approved loan ready for disbursement.',
    },
    {
      id: BORROWER_IDS.activeFresh,
      firstName: 'Ramon',
      middleName: null,
      lastName: 'Garcia',
      email: 'ramon.garcia.seed@example.com',
      phone: '09170000004',
      address: '45 Barangay 5, Taguig',
      dateOfBirth: new Date('1979-01-05'),
      gender: 'MALE' as const,
      idType: 'NATIONAL_ID' as const,
      idNumber: 'SEED-BOR-004',
      occupation: 'Mechanic',
      incomeSource: 'BUSINESS' as const,
      monthlyIncome: money(51000),
      notes: 'Workflow seed: active loan with no payments yet.',
    },
    {
      id: BORROWER_IDS.activePartial,
      firstName: 'Luz',
      middleName: null,
      lastName: 'Flores',
      email: 'luz.flores.seed@example.com',
      phone: '09170000005',
      address: '7 Bagong Silang, Caloocan',
      dateOfBirth: new Date('1985-06-30'),
      gender: 'FEMALE' as const,
      idType: 'NATIONAL_ID' as const,
      idNumber: 'SEED-BOR-005',
      occupation: 'Market Vendor',
      incomeSource: 'BUSINESS' as const,
      monthlyIncome: money(47000),
      notes: 'Workflow seed: active loan with two paid installments.',
    },
    {
      id: BORROWER_IDS.defaulted,
      firstName: 'Roberto',
      middleName: null,
      lastName: 'Rivera',
      email: 'roberto.rivera.seed@example.com',
      phone: '09170000006',
      address: '300 Barangay 10, Antipolo',
      dateOfBirth: new Date('1974-12-18'),
      gender: 'MALE' as const,
      idType: 'DRIVER_LICENSE' as const,
      idNumber: 'SEED-BOR-006',
      occupation: 'Contractor',
      incomeSource: 'OTHER' as const,
      monthlyIncome: money(63000),
      notes: 'Workflow seed: defaulted loan and provision test case.',
    },
  ];

  for (const borrower of borrowers) {
    await prisma.borrower.upsert({
      where: { id: borrower.id },
      update: {
        ...borrower,
        phoneNormalized: normalizePhone(borrower.phone),
        deletedAt: null,
      },
      create: {
        ...borrower,
        phoneNormalized: normalizePhone(borrower.phone),
      },
    });
  }

  const loanSeeds = [
    {
      id: LOAN_IDS.pending,
      borrowerId: BORROWER_IDS.pending,
      type: 'PERSONAL' as const,
      amount: 25000,
      interestRate: 0.03,
      termMonths: 6,
      startDate: today,
      status: 'PENDING' as const,
      loanFee: 500,
      purpose: 'School expenses',
      notes: 'Workflow seed: approve or cancel this loan.',
    },
    {
      id: LOAN_IDS.approved,
      borrowerId: BORROWER_IDS.approved,
      type: 'BUSINESS' as const,
      amount: 60000,
      interestRate: 0.025,
      termMonths: 12,
      startDate: today,
      status: 'APPROVED' as const,
      loanFee: 800,
      purpose: 'Inventory purchase',
      notes: 'Workflow seed: disburse this loan.',
    },
    {
      id: LOAN_IDS.activeFresh,
      borrowerId: BORROWER_IDS.activeFresh,
      type: 'SALARY' as const,
      amount: 40000,
      interestRate: 0.03,
      termMonths: 8,
      startDate: subMonths(today, 1),
      status: 'ACTIVE' as const,
      loanFee: 600,
      purpose: 'Motorcycle repair',
      notes: 'Workflow seed: record first payment.',
    },
    {
      id: LOAN_IDS.activePartial,
      borrowerId: BORROWER_IDS.activePartial,
      type: 'BUSINESS' as const,
      amount: 80000,
      interestRate: 0.03,
      termMonths: 12,
      startDate: subMonths(today, 4),
      status: 'ACTIVE' as const,
      loanFee: 1000,
      purpose: 'Stall expansion',
      notes: 'Workflow seed: two installments are already paid.',
    },
    {
      id: LOAN_IDS.defaulted,
      borrowerId: BORROWER_IDS.defaulted,
      type: 'PERSONAL' as const,
      amount: 50000,
      interestRate: 0.035,
      termMonths: 10,
      startDate: subMonths(today, 8),
      status: 'DEFAULTED' as const,
      loanFee: 750,
      purpose: 'Emergency household expense',
      notes: 'Workflow seed: default/provision scenario.',
    },
  ];

  for (const seed of loanSeeds) {
    const endDate = addMonths(seed.startDate, seed.termMonths);
    const isDisbursed = seed.status === 'ACTIVE' || seed.status === 'DEFAULTED';

    await prisma.loan.upsert({
      where: { id: seed.id },
      update: {
        borrowerId: seed.borrowerId,
        type: seed.type,
        amount: money(seed.amount),
        interestRate: rate(seed.interestRate),
        termMonths: seed.termMonths,
        status: seed.status,
        startDate: seed.startDate,
        endDate,
        paymentFrequency: 'MONTHLY',
        repaymentStructure: 'AMORTIZING',
        remainingBalance: money(seed.amount),
        totalPaid: money(0),
        loanFee: money(seed.loanFee),
        penaltyRate: rate(0.01),
        purpose: seed.purpose,
        notes: seed.notes,
        approvedAt: seed.status === 'PENDING' ? null : subDays(seed.startDate, 3),
        approvedById: seed.status === 'PENDING' ? null : adminId,
        disbursedAt: isDisbursed ? seed.startDate : null,
        disbursedById: isDisbursed ? adminId : null,
        disbursementMethod: isDisbursed ? 'CASH' : null,
        canceledAt: null,
        canceledById: null,
        cancellationReason: null,
        defaultedAt: seed.status === 'DEFAULTED' ? subMonths(today, 1) : null,
        paidAt: null,
        deletedAt: null,
        locked: false,
      },
      create: {
        id: seed.id,
        borrowerId: seed.borrowerId,
        type: seed.type,
        amount: money(seed.amount),
        interestRate: rate(seed.interestRate),
        termMonths: seed.termMonths,
        status: seed.status,
        startDate: seed.startDate,
        endDate,
        paymentFrequency: 'MONTHLY',
        repaymentStructure: 'AMORTIZING',
        remainingBalance: money(seed.amount),
        loanFee: money(seed.loanFee),
        penaltyRate: rate(0.01),
        purpose: seed.purpose,
        notes: seed.notes,
        approvedAt: seed.status === 'PENDING' ? null : subDays(seed.startDate, 3),
        approvedById: seed.status === 'PENDING' ? null : adminId,
        disbursedAt: isDisbursed ? seed.startDate : null,
        disbursedById: isDisbursed ? adminId : null,
        disbursementMethod: isDisbursed ? 'CASH' : null,
        defaultedAt: seed.status === 'DEFAULTED' ? subMonths(today, 1) : null,
      },
    });

    if (isDisbursed) {
      await prisma.capitalEntry.create({
        data: {
          id: `seed-capital-${seed.id}-disbursement`,
          flowType: 'OUTFLOW',
          source: 'LOAN_DISBURSEMENT',
          sourceId: seed.id,
          amount: money(seed.amount),
          description: `Seed loan disbursement: ${seed.purpose}`,
          createdById: adminId,
          recordedAt: seed.startDate,
        },
      });
    }
  }

  const activeFreshInstallments = buildMonthlyInstallments({
    loanId: LOAN_IDS.activeFresh,
    principal: 40000,
    monthlyRate: 0.03,
    termMonths: 8,
    startDate: subMonths(today, 1),
  });

  const activePartialInstallments = buildMonthlyInstallments({
    loanId: LOAN_IDS.activePartial,
    principal: 80000,
    monthlyRate: 0.03,
    termMonths: 12,
    startDate: subMonths(today, 4),
    statusForSequence: { 1: 'PAID', 2: 'PAID' },
  });

  const defaultedInstallments = buildMonthlyInstallments({
    loanId: LOAN_IDS.defaulted,
    principal: 50000,
    monthlyRate: 0.035,
    termMonths: 10,
    startDate: subMonths(today, 8),
    statusForSequence: { 1: 'PAID', 2: 'OVERDUE', 3: 'OVERDUE', 4: 'OVERDUE' },
  });

  await prisma.loanInstallment.createMany({
    data: [...activeFreshInstallments, ...activePartialInstallments, ...defaultedInstallments],
  });

  const paidInstallments = activePartialInstallments.filter((installment) =>
    [1, 2].includes(installment.sequence),
  );
  let totalPaid = money(0);
  let totalPrincipalPaid = money(0);

  for (const installment of paidInstallments) {
    const paymentId = `${LOAN_IDS.activePartial}-payment-${String(installment.sequence).padStart(2, '0')}`;
    const amount = installment.principal.plus(installment.interest);
    totalPaid = totalPaid.plus(amount);
    totalPrincipalPaid = totalPrincipalPaid.plus(installment.principal);

    await prisma.loanPayment.create({
      data: {
        id: paymentId,
        loanId: LOAN_IDS.activePartial,
        amount,
        principalPortion: installment.principal,
        interestPortion: installment.interest,
        paidAt: installment.dueDate,
        method: 'CASH',
        reference: `SEED-LPAY-${installment.sequence}`,
        notes: 'Seed payment for partially paid active loan.',
      },
    });

    await prisma.loanPaymentAllocation.create({
      data: {
        id: `${paymentId}-allocation`,
        paymentId,
        installmentId: installment.id,
        principalApplied: installment.principal,
        interestApplied: installment.interest,
      },
    });

    await prisma.capitalEntry.create({
      data: {
        id: `seed-capital-${paymentId}`,
        flowType: 'INFLOW',
        source: 'LOAN_PAYMENT',
        sourceId: paymentId,
        amount,
        description: `Seed loan payment: installment ${installment.sequence}`,
        createdById: adminId,
        recordedAt: installment.dueDate,
      },
    });
  }

  await prisma.loan.update({
    where: { id: LOAN_IDS.activePartial },
    data: {
      totalPaid,
      remainingBalance: money(80000).minus(totalPrincipalPaid),
    },
  });

  const defaultedFirstInstallment = defaultedInstallments[0]!;
  const defaultedPaymentAmount = defaultedFirstInstallment.principal.plus(
    defaultedFirstInstallment.interest,
  );

  await prisma.loanPayment.create({
    data: {
      id: `${LOAN_IDS.defaulted}-payment-01`,
      loanId: LOAN_IDS.defaulted,
      amount: defaultedPaymentAmount,
      principalPortion: defaultedFirstInstallment.principal,
      interestPortion: defaultedFirstInstallment.interest,
      paidAt: defaultedFirstInstallment.dueDate,
      method: 'BANK_TRANSFER',
      reference: 'SEED-LPAY-DEFAULTED-1',
      notes: 'Seed payment before default.',
    },
  });

  await prisma.loanPaymentAllocation.create({
    data: {
      id: `${LOAN_IDS.defaulted}-payment-01-allocation`,
      paymentId: `${LOAN_IDS.defaulted}-payment-01`,
      installmentId: defaultedFirstInstallment.id,
      principalApplied: defaultedFirstInstallment.principal,
      interestApplied: defaultedFirstInstallment.interest,
    },
  });

  await prisma.capitalEntry.create({
    data: {
      id: `seed-capital-${LOAN_IDS.defaulted}-payment-01`,
      flowType: 'INFLOW',
      source: 'LOAN_PAYMENT',
      sourceId: `${LOAN_IDS.defaulted}-payment-01`,
      amount: defaultedPaymentAmount,
      description: 'Seed loan payment before default.',
      createdById: adminId,
      recordedAt: defaultedFirstInstallment.dueDate,
    },
  });

  await prisma.loan.update({
    where: { id: LOAN_IDS.defaulted },
    data: {
      totalPaid: defaultedPaymentAmount,
      remainingBalance: money(50000).minus(defaultedFirstInstallment.principal),
    },
  });

  await prisma.loanProvisionEvent.create({
    data: {
      id: `${LOAN_IDS.defaulted}-provision-01`,
      loanId: LOAN_IDS.defaulted,
      type: 'PROVISION',
      bucket: 3,
      amount: money(12500),
      daysPastDue: 120,
      basisAmount: money(50000).minus(defaultedFirstInstallment.principal),
      provisionRate: rate(0.25),
      reason: 'Seed provision for defaulted workflow test.',
      createdAt: subDays(today, 10),
    },
  });

  console.log(`Borrowers: ${borrowers.length}`);
  console.log(`Loans: ${loanSeeds.length}`);
}

async function seedDepositorsAndDeposits(adminId: string) {
  const today = new Date();
  const depositors = [
    {
      id: DEPOSITOR_IDS.clean,
      name: 'Carmen Lopez',
      email: 'carmen.lopez.seed@example.com',
      phone: '09280000001',
      address: '19 Poblacion, Cebu',
      dateOfBirth: new Date('1978-02-17'),
      idType: 'NATIONAL_ID' as const,
      idNumber: 'SEED-DEP-001',
      notes: 'Workflow seed: depositor profile without deposits.',
    },
    {
      id: DEPOSITOR_IDS.active,
      name: 'Fernando Ramos',
      email: 'fernando.ramos.seed@example.com',
      phone: '09280000002',
      address: '51 Barangay 1, Manila',
      dateOfBirth: new Date('1969-04-24'),
      idType: 'PASSPORT' as const,
      idNumber: 'SEED-DEP-002',
      notes: 'Workflow seed: active maturity-only deposit.',
    },
    {
      id: DEPOSITOR_IDS.payout,
      name: 'Cecilia Torres',
      email: 'cecilia.torres.seed@example.com',
      phone: '09280000003',
      address: '64 San Antonio, Davao',
      dateOfBirth: new Date('1981-10-02'),
      idType: 'NATIONAL_ID' as const,
      idNumber: 'SEED-DEP-003',
      notes: 'Workflow seed: active deposit with payout history.',
    },
    {
      id: DEPOSITOR_IDS.closed,
      name: 'Manuel Bautista',
      email: 'manuel.bautista.seed@example.com',
      phone: '09280000004',
      address: '12 Maynila, Zamboanga',
      dateOfBirth: new Date('1972-09-12'),
      idType: 'DRIVER_LICENSE' as const,
      idNumber: 'SEED-DEP-004',
      notes: 'Workflow seed: closed deposit.',
    },
  ];

  for (const depositor of depositors) {
    await prisma.depositor.upsert({
      where: { id: depositor.id },
      update: {
        ...depositor,
        phoneNormalized: normalizePhone(depositor.phone),
        deletedAt: null,
      },
      create: {
        ...depositor,
        phoneNormalized: normalizePhone(depositor.phone),
      },
    });
  }

  const deposits = [
    {
      id: DEPOSIT_IDS.active,
      depositorId: DEPOSITOR_IDS.active,
      amount: 150000,
      expectedReturnRate: 0.05,
      termMonths: 12,
      startDate: subMonths(today, 2),
      status: 'ACTIVE' as const,
      payoutType: 'MATURITY_ONLY' as const,
      notes: 'Workflow seed: active deposit ready for payout/closure tests.',
    },
    {
      id: DEPOSIT_IDS.payout,
      depositorId: DEPOSITOR_IDS.payout,
      amount: 250000,
      expectedReturnRate: 0.02,
      termMonths: 12,
      startDate: subMonths(today, 4),
      status: 'ACTIVE' as const,
      payoutType: 'MONTHLY_INTEREST' as const,
      notes: 'Workflow seed: active deposit with two recorded monthly payouts.',
    },
    {
      id: DEPOSIT_IDS.closed,
      depositorId: DEPOSITOR_IDS.closed,
      amount: 100000,
      expectedReturnRate: 0.06,
      termMonths: 6,
      startDate: subMonths(today, 8),
      status: 'CLOSED' as const,
      payoutType: 'MATURITY_ONLY' as const,
      notes: 'Workflow seed: closed deposit with principal returned.',
    },
  ];

  for (const seed of deposits) {
    const closedAt = seed.status === 'CLOSED' ? subMonths(today, 1) : null;

    await prisma.deposit.upsert({
      where: { id: seed.id },
      update: {
        depositorId: seed.depositorId,
        amount: money(seed.amount),
        expectedReturnRate: rate(seed.expectedReturnRate),
        expectedReturnRatePeriod: 'MONTH',
        termMonths: seed.termMonths,
        startDate: seed.startDate,
        endDate: addMonths(seed.startDate, seed.termMonths),
        status: seed.status,
        hasBeenWithdrawn: false,
        depositType: 'REGULAR',
        payoutType: seed.payoutType,
        principalReturned: seed.status === 'CLOSED' ? money(seed.amount) : money(0),
        totalPayoutPaid: money(0),
        closedAt,
        withdrawnAt: null,
        notes: seed.notes,
        reference: `SEED-${seed.id}`,
        deletedAt: null,
      },
      create: {
        id: seed.id,
        depositorId: seed.depositorId,
        amount: money(seed.amount),
        expectedReturnRate: rate(seed.expectedReturnRate),
        expectedReturnRatePeriod: 'MONTH',
        termMonths: seed.termMonths,
        startDate: seed.startDate,
        endDate: addMonths(seed.startDate, seed.termMonths),
        status: seed.status,
        depositType: 'REGULAR',
        payoutType: seed.payoutType,
        principalReturned: seed.status === 'CLOSED' ? money(seed.amount) : money(0),
        closedAt,
        notes: seed.notes,
        reference: `SEED-${seed.id}`,
      },
    });

    await prisma.capitalEntry.create({
      data: {
        id: `seed-capital-${seed.id}-inflow`,
        flowType: 'INFLOW',
        source: 'DEPOSIT',
        sourceId: seed.id,
        amount: money(seed.amount),
        description: `Seed deposit received: ${seed.id}`,
        createdById: adminId,
        recordedAt: seed.startDate,
      },
    });

    if (seed.status === 'CLOSED') {
      await prisma.capitalEntry.create({
        data: {
          id: `seed-capital-${seed.id}-withdrawal`,
          flowType: 'OUTFLOW',
          source: 'DEPOSIT_WITHDRAWAL',
          sourceId: seed.id,
          amount: money(seed.amount),
          description: 'Seed closed deposit principal return.',
          createdById: adminId,
          recordedAt: closedAt ?? today,
        },
      });
    }
  }

  const payoutSeed = deposits.find((deposit) => deposit.id === DEPOSIT_IDS.payout)!;
  const payoutAmount = money(payoutSeed.amount * payoutSeed.expectedReturnRate);
  let totalPayoutPaid = money(0);

  for (const sequence of [1, 2]) {
    const payoutId = `${DEPOSIT_IDS.payout}-payout-${String(sequence).padStart(2, '0')}`;
    const paidAt = addMonths(payoutSeed.startDate, sequence);
    totalPayoutPaid = totalPayoutPaid.plus(payoutAmount);

    await prisma.depositPayout.create({
      data: {
        id: payoutId,
        depositId: DEPOSIT_IDS.payout,
        amount: payoutAmount,
        returnPortion: payoutAmount,
        principalPortion: money(0),
        paidAt,
        method: 'BANK_TRANSFER',
        notes: 'Seed monthly interest payout.',
      },
    });

    await prisma.capitalEntry.create({
      data: {
        id: `seed-capital-${payoutId}`,
        flowType: 'OUTFLOW',
        source: 'DEPOSIT_PAYOUT',
        sourceId: payoutId,
        amount: payoutAmount,
        description: `Seed deposit monthly payout ${sequence}.`,
        createdById: adminId,
        recordedAt: paidAt,
      },
    });
  }

  await prisma.deposit.update({
    where: { id: DEPOSIT_IDS.payout },
    data: { totalPayoutPaid },
  });

  console.log(`Depositors: ${depositors.length}`);
  console.log(`Deposits: ${deposits.length}`);
}

async function seedBusinessFunds(adminId: string) {
  const funds = [
    {
      id: BUSINESS_FUND_IDS.initial,
      dateAdded: subMonths(new Date(), 12),
      amount: 500000,
      remarks: 'Seed initial business capital',
    },
    {
      id: BUSINESS_FUND_IDS.topUp,
      dateAdded: subMonths(new Date(), 3),
      amount: 150000,
      remarks: 'Seed operating capital top-up',
    },
  ];

  for (const fund of funds) {
    await prisma.businessFund.upsert({
      where: { id: fund.id },
      update: {
        dateAdded: fund.dateAdded,
        amount: money(fund.amount),
        remarks: fund.remarks,
        status: 'ACTIVE',
      },
      create: {
        id: fund.id,
        dateAdded: fund.dateAdded,
        amount: money(fund.amount),
        remarks: fund.remarks,
        status: 'ACTIVE',
      },
    });

    await prisma.capitalEntry.upsert({
      where: { id: `seed-capital-${fund.id}` },
      update: {
        flowType: 'INFLOW',
        source: 'BUSINESS_CAPITAL',
        sourceId: fund.id,
        amount: money(fund.amount),
        description: fund.remarks,
        createdById: adminId,
        recordedAt: fund.dateAdded,
      },
      create: {
        id: `seed-capital-${fund.id}`,
        flowType: 'INFLOW',
        source: 'BUSINESS_CAPITAL',
        sourceId: fund.id,
        amount: money(fund.amount),
        description: fund.remarks,
        createdById: adminId,
        recordedAt: fund.dateAdded,
      },
    });
  }

  console.log(`Business funds: ${funds.length}`);
}

async function seedWorkflowActivity(adminId: string) {
  const activities = [
    {
      id: 'seed-activity-loan-pending-created',
      action: 'LOAN_CREATED',
      targetId: LOAN_IDS.pending,
      metadata: { scenario: 'Pending loan ready for approval' },
    },
    {
      id: 'seed-activity-loan-approved',
      action: 'LOAN_APPROVED',
      targetId: LOAN_IDS.approved,
      metadata: { scenario: 'Approved loan ready for disbursement' },
    },
    {
      id: 'seed-activity-loan-payment-recorded',
      action: 'LOAN_PAYMENT_RECORDED',
      targetId: LOAN_IDS.activePartial,
      metadata: { scenario: 'Active loan with partial payment history' },
    },
    {
      id: 'seed-activity-loan-defaulted',
      action: 'LOAN_DEFAULTED',
      targetId: LOAN_IDS.defaulted,
      metadata: { scenario: 'Defaulted loan with provision event' },
    },
  ];

  await prisma.activityLog.createMany({
    data: activities.map((activity) => ({
      ...activity,
      userId: adminId,
      actorType: 'USER' as const,
      category: 'AUDIT' as const,
      createdAt: new Date(),
    })),
  });

  console.log(`Activity logs: ${activities.length}`);
}

async function main() {
  console.log('Seeding deterministic workflow data...\n');

  const { admin } = await seedUsers();
  await resetSeedOwnedRows();
  await seedBusinessFunds(admin.id);
  await seedBorrowersAndLoans(admin.id);
  await seedWorkflowActivity(admin.id);

  console.log('\nSeed login credentials');
  console.log(`Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`Staff: ${STAFF_EMAIL} / ${STAFF_PASSWORD}`);
  console.log('\nDone.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
