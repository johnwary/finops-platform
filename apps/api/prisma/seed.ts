import 'dotenv/config';
import { createHash } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from 'better-auth/crypto';
import { addMonths, subDays, subMonths } from 'date-fns';
import { PrismaClient } from '../src/generated/prisma/client.js';

// This seed drives the REAL service functions (createLoan, disburse, recordPayment,
// createDeposit, recordPayout, …) instead of hand-crafting rows, so every ledger
// entry, installment schedule, allocation, and audit log is shaped exactly as the
// running app would produce it. Service functions hardcode createdAt/recordedAt to
// now(); we backdate those afterwards with a raw UPDATE keyed off each record's
// domain date, so reports show ~6 months of history. Dates that ARE service inputs
// (applicationDate, approvedAt, disbursedAt, paidAt) are passed directly.
//
// Guarded to non-production; wipes app data first (User/Account preserved) so
// re-seeding is idempotent.

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed: NODE_ENV is production. Seeding overwrites real data.');
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const LOCAL_DB_HOSTS = ['localhost', '127.0.0.1'];
const dbHost = new URL(databaseUrl).hostname;
const isRemoteDb = !LOCAL_DB_HOSTS.includes(dbHost);
if (isRemoteDb && process.env.ALLOW_REMOTE_SEED !== '1') {
  console.error(
    `Refusing to seed: DATABASE_URL points at non-local host "${dbHost}". Seeding wipes app data first.\n` +
      'Set ALLOW_REMOTE_SEED=1 to override for a one-off remote seed (only for a fresh/empty database).',
  );
  process.exit(1);
}

const adapter = new PrismaPg(databaseUrl);
const prisma = new PrismaClient({ adapter });

// ALLOW_REMOTE_SEED is documented as "fresh/empty database only", but nothing
// enforced it - one stray run against a live deployment wiped its borrowers,
// loans and deposits. On a remote DB the override now only unlocks an *empty*
// one; wiping real records requires deleting them deliberately first.
if (isRemoteDb) {
  const existing = await prisma.borrower.count();
  if (existing > 0) {
    console.error(
      `Refusing to seed: remote database "${dbHost}" already holds ${existing} borrower(s). ` +
        'ALLOW_REMOTE_SEED is only for a fresh/empty database - seeding wipes app data first.',
    );
    await prisma.$disconnect();
    process.exit(1);
  }
}

// The service layer imports the prisma SINGLETON from src/lib/prisma. To have the
// services write to the same connection this script controls, we import them after
// setting DATABASE_URL (already loaded via dotenv). They accept a plain Actor {id}.
const loans = await import('../src/features/loans/loans.service.js');
const deposits = await import('../src/features/deposits/deposits.service.js');
const funds = await import('../src/features/funds/funds.service.js');
const { markPastDueInstallmentsOverdue } = await import('../src/jobs/autoDefault.job.js');

const TODAY = new Date('2026-07-06T04:00:00.000Z'); // noon Manila, fixed anchor

const PASSWORD = 'password123';
const USERS = [
  { id: 'seed-user-owner', email: 'owner@finops.ph', name: 'Ricardo Dela Cruz', role: 'admin' },
  { id: 'seed-user-manager', email: 'manager@finops.ph', name: 'Grace Villanueva', role: 'manager' },
  { id: 'seed-user-staff1', email: 'liza@finops.ph', name: 'Liza Mendoza', role: 'user' },
  { id: 'seed-user-staff2', email: 'paolo@finops.ph', name: 'Paolo Gutierrez', role: 'user' },
] as const;

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('63') && digits.length === 12) return '0' + digits.slice(2);
  if (digits.length === 10) return '0' + digits;
  return digits;
}

// Seed rows are cross-referenced by readable keys ('seed-bor-01'), but every
// :id route validates z.uuid() — a raw key makes the detail pages 422. Hash the
// key into a stable v4-shaped UUID so the keys stay readable above, references
// keep resolving, and re-seeding reproduces the same ids.
function seedUuid(key: string): string {
  const h = createHash('sha256').update(key).digest('hex');
  const variant = ((parseInt(h[16]!, 16) & 0x3) | 0x8).toString(16);
  return [h.slice(0, 8), h.slice(8, 12), `4${h.slice(13, 16)}`, `${variant}${h.slice(17, 20)}`, h.slice(20, 32)].join('-');
}

// Seed key -> actual User.id, filled by seedUsers(). Users are preserved across
// re-seeds, so an existing account keeps an id that seedUuid() cannot derive.
const SEED_USER_IDS = new Map<string, string>();

function seedUserId(key: string): string {
  const id = SEED_USER_IDS.get(key);
  if (!id) throw new Error(`Seed user "${key}" not resolved — seedUsers() must run first.`);
  return id;
}

// ── wipe (preserve User/Account) ───────────────────────────────────────────────

async function clearAppData() {
  await prisma.$transaction(
    async (tx) => {
      await tx.capitalEntry.updateMany({ data: { reversedByEntryId: null } });
      await tx.invitation.deleteMany();
      await tx.activityLog.deleteMany();
      await tx.verification.deleteMany();
      await tx.session.deleteMany();
      await tx.loanPaymentAllocation.deleteMany();
      await tx.loanPayment.deleteMany();
      await tx.loanInstallment.deleteMany();
      await tx.loanProvisionEvent.deleteMany();
      await tx.loan.deleteMany();
      await tx.borrower.deleteMany();
      await tx.depositPayout.deleteMany();
      await tx.deposit.deleteMany();
      await tx.depositor.deleteMany();
      await tx.capitalEntry.deleteMany();
      await tx.businessFund.deleteMany();
      // CompanyProfile is real configuration, not demo data - an operator edits it
      // through Settings. Wiping it here made every re-seed silently restore the
      // hardcoded demo name; seedCompanyProfile() upserts with `update: {}` so an
      // existing profile is left alone and a fresh DB still gets the demo one.
    },
    { timeout: 30_000 },
  );
}

// ── timestamp backdating ─────────────────────────────────────────────────────────
// Services stamp createdAt/recordedAt = now(). Re-anchor them to the domain date so
// the 6-month history is real from a reporting standpoint.

async function backdateCapitalEntry(source: string, sourceId: string, at: Date) {
  await prisma.capitalEntry.updateMany({ where: { source, sourceId }, data: { recordedAt: at } });
}
async function backdateLoanPaymentCapital(paymentId: string, at: Date) {
  await backdateCapitalEntry('LOAN_PAYMENT', paymentId, at);
}
async function backdateActivity(targetId: string, at: Date) {
  await prisma.activityLog.updateMany({ where: { targetId }, data: { createdAt: at } });
}

// ── users ──────────────────────────────────────────────────────────────────────

async function seedUsers() {
  const hashed = await hashPassword(PASSWORD);
  for (const u of USERS) {
    // Upsert is keyed on email, so a pre-existing user keeps its own id (User and
    // Account survive clearAppData). Use the id it returns, not the seed key.
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, emailVerified: true, banned: false },
      create: { id: seedUuid(u.id), email: u.email, name: u.name, role: u.role, emailVerified: true },
    });
    SEED_USER_IDS.set(u.id, user.id);
    const existing = await prisma.account.findFirst({
      where: { providerId: 'credential', accountId: u.email },
    });
    if (existing) {
      await prisma.account.update({ where: { id: existing.id }, data: { userId: user.id, password: hashed } });
    } else {
      await prisma.account.create({
        data: { id: seedUuid(`${u.id}-account`), userId: user.id, accountId: u.email, providerId: 'credential', password: hashed },
      });
    }
  }
  console.log(`Users: ${USERS.map((u) => u.email).join(', ')}`);
}

// ── company ──────────────────────────────────────────────────────────────────────

async function seedCompany() {
  await prisma.companyProfile.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'Metro Kabuhayan Lending Corp.',
      address: 'Unit 4B, Cityland Tower, 6764 Ayala Ave, Makati City 1226',
      phone: '(02) 8845 1200',
      email: 'info@metrokabuhayan.ph',
      website: 'https://metrokabuhayan.ph',
      taxId: '009-482-771-000',
    },
  });
  console.log('Company profile: Metro Kabuhayan Lending Corp.');
}

// ── borrowers ────────────────────────────────────────────────────────────────────

type BorrowerSeed = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE';
  idType: 'NATIONAL_ID' | 'PASSPORT' | 'DRIVER_LICENSE';
  occupation: string;
  incomeSource: 'EMPLOYMENT' | 'BUSINESS' | 'PENSION' | 'OTHER';
  monthlyIncome: number;
};

const BORROWERS: BorrowerSeed[] = [
  { id: 'seed-bor-01', firstName: 'Ana', middleName: 'Reyes', lastName: 'Santos', phone: '09171234501', address: '25 Kalayaan Ave, Barangay Central, Quezon City', dateOfBirth: '1988-03-14', gender: 'FEMALE', idType: 'NATIONAL_ID', occupation: 'Public School Teacher', incomeSource: 'EMPLOYMENT', monthlyIncome: 38000 },
  { id: 'seed-bor-02', firstName: 'Jose', middleName: null, lastName: 'Reyes', phone: '09281234502', address: '14 Aguinaldo St, Barangay San Antonio, Pasig City', dateOfBirth: '1982-08-09', gender: 'MALE', idType: 'DRIVER_LICENSE', occupation: 'Grab Driver', incomeSource: 'BUSINESS', monthlyIncome: 32000 },
  { id: 'seed-bor-03', firstName: 'Maria', middleName: 'Cruz', lastName: 'Bautista', phone: '09391234503', address: '88 Boni Ave, Barangay Plainview, Mandaluyong City', dateOfBirth: '1990-11-21', gender: 'FEMALE', idType: 'NATIONAL_ID', occupation: 'Online Reseller', incomeSource: 'BUSINESS', monthlyIncome: 55000 },
  { id: 'seed-bor-04', firstName: 'Ramon', middleName: 'Diaz', lastName: 'Garcia', phone: '09171234504', address: '45 C. Raymundo Ave, Barangay Maybunga, Pasig City', dateOfBirth: '1979-01-05', gender: 'MALE', idType: 'NATIONAL_ID', occupation: 'Auto Mechanic', incomeSource: 'BUSINESS', monthlyIncome: 48000 },
  { id: 'seed-bor-05', firstName: 'Luz', middleName: null, lastName: 'Flores', phone: '09281234505', address: '7 Gen. Luna St, Barangay Bagong Silang, Caloocan City', dateOfBirth: '1985-06-30', gender: 'FEMALE', idType: 'NATIONAL_ID', occupation: 'Palengke Vendor', incomeSource: 'BUSINESS', monthlyIncome: 42000 },
  { id: 'seed-bor-06', firstName: 'Roberto', middleName: 'Lim', lastName: 'Rivera', phone: '09391234506', address: '300 Sumulong Hwy, Barangay Mayamot, Antipolo City', dateOfBirth: '1974-12-18', gender: 'MALE', idType: 'DRIVER_LICENSE', occupation: 'Building Contractor', incomeSource: 'BUSINESS', monthlyIncome: 70000 },
  { id: 'seed-bor-07', firstName: 'Carmela', middleName: 'Ong', lastName: 'Tan', phone: '09171234507', address: '112 Katipunan Ave, Barangay Loyola Heights, Quezon City', dateOfBirth: '1993-04-02', gender: 'FEMALE', idType: 'PASSPORT', occupation: 'Nurse', incomeSource: 'EMPLOYMENT', monthlyIncome: 45000 },
  { id: 'seed-bor-08', firstName: 'Antonio', middleName: 'Cruz', lastName: 'Mercado', phone: '09281234508', address: '9 M.L. Quezon St, Barangay Ususan, Taguig City', dateOfBirth: '1968-09-27', gender: 'MALE', idType: 'NATIONAL_ID', occupation: 'Retired Government Employee', incomeSource: 'PENSION', monthlyIncome: 28000 },
  { id: 'seed-bor-09', firstName: 'Divina', middleName: null, lastName: 'Aquino', phone: '09391234509', address: '63 Shaw Blvd, Barangay Kapitolyo, Pasig City', dateOfBirth: '1991-07-15', gender: 'FEMALE', idType: 'NATIONAL_ID', occupation: 'Sari-sari Store Owner', incomeSource: 'BUSINESS', monthlyIncome: 36000 },
  { id: 'seed-bor-10', firstName: 'Ferdinand', middleName: 'Reyes', lastName: 'Domingo', phone: '09171234510', address: '5 Roxas Blvd, Barangay Malate, Manila', dateOfBirth: '1980-02-11', gender: 'MALE', idType: 'DRIVER_LICENSE', occupation: 'Jeepney Operator', incomeSource: 'BUSINESS', monthlyIncome: 52000 },
  { id: 'seed-bor-11', firstName: 'Rosario', middleName: 'Villanueva', lastName: 'Castro', phone: '09281234511', address: '210 E. Rodriguez Ave, Barangay Kalusugan, Quezon City', dateOfBirth: '1987-10-08', gender: 'FEMALE', idType: 'NATIONAL_ID', occupation: 'Beauty Salon Owner', incomeSource: 'BUSINESS', monthlyIncome: 47000 },
  { id: 'seed-bor-12', firstName: 'Enrique', middleName: null, lastName: 'Salvador', phone: '09391234512', address: '18 P. Burgos St, Barangay Poblacion, Makati City', dateOfBirth: '1976-05-19', gender: 'MALE', idType: 'NATIONAL_ID', occupation: 'Restaurant Owner', incomeSource: 'BUSINESS', monthlyIncome: 85000 },
  { id: 'seed-bor-13', firstName: 'Teresita', middleName: 'Ramos', lastName: 'Navarro', phone: '09171234513', address: '77 Marcos Hwy, Barangay Santolan, Marikina City', dateOfBirth: '1972-11-30', gender: 'FEMALE', idType: 'NATIONAL_ID', occupation: 'Seamstress', incomeSource: 'BUSINESS', monthlyIncome: 30000 },
  { id: 'seed-bor-14', firstName: 'Miguel', middleName: 'Santos', lastName: 'Pascual', phone: '09281234514', address: '32 Ortigas Ave, Barangay Greenhills, San Juan City', dateOfBirth: '1995-01-23', gender: 'MALE', idType: 'PASSPORT', occupation: 'IT Freelancer', incomeSource: 'EMPLOYMENT', monthlyIncome: 60000 },
  { id: 'seed-bor-15', firstName: 'Beatriz', middleName: null, lastName: 'Gonzales', phone: '09391234515', address: '4 J.P. Rizal St, Barangay Comembo, Makati City', dateOfBirth: '1983-08-16', gender: 'FEMALE', idType: 'NATIONAL_ID', occupation: 'Laundry Shop Owner', incomeSource: 'BUSINESS', monthlyIncome: 40000 },
];

async function seedBorrowers() {
  for (const b of BORROWERS) {
    await prisma.borrower.create({
      data: {
        id: seedUuid(b.id),
        firstName: b.firstName,
        middleName: b.middleName,
        lastName: b.lastName,
        email: `${b.firstName}.${b.lastName}`.toLowerCase().replace(/[^a-z.]/g, '') + '@example.ph',
        phone: b.phone,
        phoneNormalized: normalizePhone(b.phone),
        address: b.address,
        dateOfBirth: new Date(b.dateOfBirth),
        gender: b.gender,
        idType: b.idType,
        idNumber: `${b.idType === 'NATIONAL_ID' ? 'PSN' : b.idType === 'PASSPORT' ? 'P' : 'N'}${b.id.slice(-2)}-${Math.floor(1000 + Math.random() * 8999)}`,
        occupation: b.occupation,
        incomeSource: b.incomeSource,
        monthlyIncome: b.monthlyIncome,
      },
    });
  }
  console.log(`Borrowers: ${BORROWERS.length}`);
}

// ── loans via services ───────────────────────────────────────────────────────────

type Actor = { id: string };

type LoanPlan = {
  id: string; // human key for logs only
  borrowerId: string;
  type: 'SALARY' | 'BUSINESS' | 'PERSONAL' | 'PURCHASE_ORDER' | 'PENSION' | 'INVESTMENT';
  amount: number;
  interestRate: number; // monthly decimal
  termMonths: number;
  frequency: 'MONTHLY' | 'BIWEEKLY' | 'WEEKLY' | 'DAILY';
  structure: 'AMORTIZING' | 'INTEREST_ONLY';
  loanFee?: number;
  penaltyRate?: number; // daily
  purpose: string;
  monthsAgo: number; // application/disbursement age
  // lifecycle
  stage: 'PENDING' | 'APPROVED' | 'ACTIVE' | 'PAID' | 'ARREARS' | 'DEFAULTED' | 'CANCELED' | 'REVERSED';
  paymentsMade?: number; // number of on-time installments paid (approx, for MONTHLY)
};

// Build a schedule of loans covering the whole lifecycle. Owner/manager/staff act.
// Resolved lazily: seedUsers() fills SEED_USER_IDS, and an already-present user
// keeps its own id, so the real id is only known once that has run.
const OWNER = (): Actor => ({ id: seedUserId('seed-user-owner') });
const MANAGER = (): Actor => ({ id: seedUserId('seed-user-manager') });
const STAFF1 = (): Actor => ({ id: seedUserId('seed-user-staff1') });
const STAFF2 = (): Actor => ({ id: seedUserId('seed-user-staff2') });

const LOAN_PLANS: LoanPlan[] = [
  // Fully repaid loans (started ~6-7 months ago, short terms, all installments paid)
  { id: 'L-paid-1', borrowerId: 'seed-bor-01', type: 'SALARY', amount: 30000, interestRate: 0.03, termMonths: 5, frequency: 'MONTHLY', structure: 'AMORTIZING', loanFee: 500, penaltyRate: 0.001, purpose: 'Tuition fees', monthsAgo: 6, stage: 'PAID' },
  { id: 'L-paid-2', borrowerId: 'seed-bor-07', type: 'PERSONAL', amount: 20000, interestRate: 0.035, termMonths: 4, frequency: 'MONTHLY', structure: 'AMORTIZING', purpose: 'Medical expenses', monthsAgo: 6, stage: 'PAID' },

  // Active, mid-repayment, on-time history
  { id: 'L-active-1', borrowerId: 'seed-bor-03', type: 'BUSINESS', amount: 80000, interestRate: 0.03, termMonths: 12, frequency: 'MONTHLY', structure: 'AMORTIZING', loanFee: 1000, penaltyRate: 0.001, purpose: 'Inventory restock', monthsAgo: 4, stage: 'ACTIVE', paymentsMade: 4 },
  { id: 'L-active-2', borrowerId: 'seed-bor-04', type: 'BUSINESS', amount: 50000, interestRate: 0.03, termMonths: 10, frequency: 'MONTHLY', structure: 'AMORTIZING', loanFee: 700, penaltyRate: 0.001, purpose: 'Shop equipment', monthsAgo: 3, stage: 'ACTIVE', paymentsMade: 3 },
  { id: 'L-active-3', borrowerId: 'seed-bor-05', type: 'BUSINESS', amount: 40000, interestRate: 0.03, termMonths: 8, frequency: 'BIWEEKLY', structure: 'AMORTIZING', loanFee: 600, penaltyRate: 0.001, purpose: 'Stall expansion', monthsAgo: 2, stage: 'ACTIVE', paymentsMade: 3 },
  { id: 'L-active-4', borrowerId: 'seed-bor-11', type: 'BUSINESS', amount: 60000, interestRate: 0.028, termMonths: 12, frequency: 'MONTHLY', structure: 'AMORTIZING', loanFee: 800, penaltyRate: 0.001, purpose: 'Salon renovation', monthsAgo: 3, stage: 'ACTIVE', paymentsMade: 3 },
  { id: 'L-active-5', borrowerId: 'seed-bor-12', type: 'INVESTMENT', amount: 120000, interestRate: 0.025, termMonths: 12, frequency: 'MONTHLY', structure: 'INTEREST_ONLY', loanFee: 1500, penaltyRate: 0.001, purpose: 'Restaurant working capital', monthsAgo: 4, stage: 'ACTIVE', paymentsMade: 4 },
  { id: 'L-active-6', borrowerId: 'seed-bor-14', type: 'PERSONAL', amount: 45000, interestRate: 0.03, termMonths: 6, frequency: 'MONTHLY', structure: 'AMORTIZING', purpose: 'Laptop upgrade', monthsAgo: 2, stage: 'ACTIVE', paymentsMade: 2 },
  { id: 'L-active-7', borrowerId: 'seed-bor-15', type: 'BUSINESS', amount: 35000, interestRate: 0.032, termMonths: 8, frequency: 'MONTHLY', structure: 'AMORTIZING', loanFee: 500, penaltyRate: 0.001, purpose: 'Laundry machines', monthsAgo: 3, stage: 'ACTIVE', paymentsMade: 3 },
  { id: 'L-active-8', borrowerId: 'seed-bor-08', type: 'PENSION', amount: 25000, interestRate: 0.03, termMonths: 6, frequency: 'MONTHLY', structure: 'AMORTIZING', purpose: 'Home repair', monthsAgo: 2, stage: 'ACTIVE', paymentsMade: 2 },

  // In arrears: disbursed long enough ago that some installments are overdue and unpaid
  { id: 'L-arrears-1', borrowerId: 'seed-bor-10', type: 'BUSINESS', amount: 70000, interestRate: 0.035, termMonths: 12, frequency: 'MONTHLY', structure: 'AMORTIZING', loanFee: 900, penaltyRate: 0.0015, purpose: 'Jeepney engine overhaul', monthsAgo: 5, stage: 'ARREARS', paymentsMade: 2 },
  { id: 'L-arrears-2', borrowerId: 'seed-bor-13', type: 'PERSONAL', amount: 30000, interestRate: 0.035, termMonths: 8, frequency: 'MONTHLY', structure: 'AMORTIZING', penaltyRate: 0.0015, purpose: 'Family emergency', monthsAgo: 4, stage: 'ARREARS', paymentsMade: 1 },

  // Reversed payment (LIFO): active loan, made 3 payments, latest reversed
  { id: 'L-reversed', borrowerId: 'seed-bor-09', type: 'BUSINESS', amount: 40000, interestRate: 0.03, termMonths: 10, frequency: 'MONTHLY', structure: 'AMORTIZING', loanFee: 600, penaltyRate: 0.001, purpose: 'Store inventory', monthsAgo: 3, stage: 'REVERSED', paymentsMade: 3 },

  // Defaulted: 90+ DPD, driven through the real auto-default job
  { id: 'L-defaulted', borrowerId: 'seed-bor-06', type: 'PERSONAL', amount: 50000, interestRate: 0.04, termMonths: 10, frequency: 'MONTHLY', structure: 'AMORTIZING', loanFee: 750, penaltyRate: 0.002, purpose: 'Construction materials advance', monthsAgo: 7, stage: 'DEFAULTED', paymentsMade: 1 },

  // Pipeline
  { id: 'L-pending', borrowerId: 'seed-bor-02', type: 'PERSONAL', amount: 25000, interestRate: 0.03, termMonths: 6, frequency: 'MONTHLY', structure: 'AMORTIZING', loanFee: 500, purpose: 'Motorcycle down payment', monthsAgo: 0, stage: 'PENDING' },
  { id: 'L-approved', borrowerId: 'seed-bor-03', type: 'BUSINESS', amount: 55000, interestRate: 0.028, termMonths: 12, frequency: 'MONTHLY', structure: 'AMORTIZING', loanFee: 800, purpose: 'Second branch stock', monthsAgo: 0, stage: 'APPROVED' },
  { id: 'L-canceled', borrowerId: 'seed-bor-13', type: 'PERSONAL', amount: 15000, interestRate: 0.03, termMonths: 4, frequency: 'MONTHLY', structure: 'AMORTIZING', purpose: 'Appliance purchase', monthsAgo: 1, stage: 'CANCELED' },
];

const STAFF_POOL = [STAFF1, STAFF2, MANAGER];

async function createAndAdvanceLoan(plan: LoanPlan, index: number) {
  const staff = STAFF_POOL[index % STAFF_POOL.length]!();
  const appDate = plan.monthsAgo > 0 ? subMonths(TODAY, plan.monthsAgo) : subDays(TODAY, 1);

  const loan = await loans.createLoan(
    {
      borrowerId: seedUuid(plan.borrowerId),
      type: plan.type,
      amount: plan.amount,
      interestRate: plan.interestRate,
      termMonths: plan.termMonths,
      applicationDate: appDate,
      paymentFrequency: plan.frequency,
      repaymentStructure: plan.structure,
      loanFee: plan.loanFee,
      penaltyRate: plan.penaltyRate,
      purpose: plan.purpose,
    },
    staff,
  );
  await prisma.loan.update({ where: { id: loan.id }, data: { createdAt: appDate, applicationDate: appDate } });
  await backdateActivity(loan.id, appDate);

  if (plan.stage === 'PENDING') return loan.id;

  // Approve (backdate approvedAt to just after application)
  const approvedAt = plan.monthsAgo > 0 ? addMonths(appDate, 0) : appDate;
  await loans.approveLoan(loan.id, { approvedAt: subDays(TODAY, plan.monthsAgo > 0 ? plan.monthsAgo * 30 - 2 : 0) }, MANAGER());
  await prisma.loan.update({ where: { id: loan.id }, data: { approvedAt } });

  if (plan.stage === 'APPROVED') return loan.id;
  if (plan.stage === 'CANCELED') {
    await loans.cancelLoan(loan.id, { cancellationReason: 'Borrower withdrew application before disbursement.' }, MANAGER());
    await prisma.loan.update({ where: { id: loan.id }, data: { canceledAt: appDate } });
    return loan.id;
  }

  // Disburse (installments generated from disbursedAt)
  const disbursedAt = appDate;
  await loans.disburseLoan(loan.id, { disbursementMethod: index % 2 ? 'BANK_TRANSFER' : 'CASH', disbursedAt, collectFee: !!plan.loanFee }, staff);
  await prisma.loan.update({ where: { id: loan.id }, data: { disbursedAt } });
  await backdateCapitalEntry('LOAN_DISBURSEMENT', loan.id, disbursedAt);
  if (plan.loanFee) await backdateCapitalEntry('LOAN_FEE', loan.id, disbursedAt);

  // Fetch installments to derive on-time payment amounts + dates
  const installments = await prisma.loanInstallment.findMany({
    where: { loanId: loan.id },
    orderBy: { sequence: 'asc' },
  });

  const toPay = plan.stage === 'PAID' ? installments.length : (plan.paymentsMade ?? 0);
  for (let i = 0; i < toPay && i < installments.length; i++) {
    const inst = installments[i]!;
    const amount = Number(inst.principal) + Number(inst.interest);
    const paidAt = inst.dueDate <= TODAY ? inst.dueDate : subDays(TODAY, 1);
    const payment = await loans.recordPayment(
      loan.id,
      { amount: Number(amount.toFixed(2)), paidAt, method: i % 2 ? 'GCASH' : 'CASH', reference: `OR-${loan.id.slice(0, 8)}-${i + 1}` },
      staff,
    );
    await prisma.loanPayment.update({ where: { id: payment.id }, data: { createdAt: paidAt } });
    await backdateLoanPaymentCapital(payment.id, paidAt);
  }
  await backdateActivity(loan.id, disbursedAt);

  // Reversed-payment scenario: reverse the most recent payment (LIFO).
  if (plan.stage === 'REVERSED') {
    const latest = await prisma.loanPayment.findFirst({
      where: { loanId: loan.id, reversedAt: null },
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
    });
    if (latest) {
      await loans.reversePayment(loan.id, latest.id, { reason: 'Duplicate entry — borrower paid once, keyed twice.' }, MANAGER());
    }
  }

  return loan.id;
}

async function seedLoans() {
  const ids: Record<string, string> = {};
  for (let i = 0; i < LOAN_PLANS.length; i++) {
    const plan = LOAN_PLANS[i]!;
    ids[plan.id] = await createAndAdvanceLoan(plan, i);
  }

  // Flip past-due unpaid installments to OVERDUE exactly as the daily job does.
  const overdue = await markPastDueInstallmentsOverdue(TODAY);

  // Arrears loans: mark IN_ARREARS (they now have OVERDUE installments).
  for (const plan of LOAN_PLANS.filter((p) => p.stage === 'ARREARS')) {
    await loans.markLoanArrears(ids[plan.id]!, { reason: 'Missed installments past due date.' }, MANAGER());
  }

  // Defaulted loan: it has 90+ DPD OVERDUE installments — run the real default path.
  const defPlan = LOAN_PLANS.find((p) => p.stage === 'DEFAULTED')!;
  await loans.defaultLoan(ids[defPlan.id]!, { reason: 'Auto-default: 90+ days past due.' }, OWNER());
  const defDate = subDays(TODAY, 15);
  await prisma.loan.update({ where: { id: ids[defPlan.id]! }, data: { defaultedAt: defDate } });
  await prisma.loanProvisionEvent.updateMany({ where: { loanId: ids[defPlan.id]! }, data: { createdAt: defDate } });

  console.log(`Loans: ${LOAN_PLANS.length} (${overdue} installments marked overdue)`);
  return ids;
}

// ── depositors & deposits via services ───────────────────────────────────────────

type DepositorSeed = { id: string; name: string; phone: string; address: string; dateOfBirth: string };
const DEPOSITORS: DepositorSeed[] = [
  { id: 'seed-dep-01', name: 'Carmen Lopez', phone: '09171230001', address: '19 Legaspi St, Barangay San Lorenzo, Makati City', dateOfBirth: '1978-02-17' },
  { id: 'seed-dep-02', name: 'Fernando Ramos', phone: '09281230002', address: '51 Timog Ave, Barangay Sacred Heart, Quezon City', dateOfBirth: '1969-04-24' },
  { id: 'seed-dep-03', name: 'Cecilia Torres', phone: '09391230003', address: '64 Wilson St, Barangay Greenhills, San Juan City', dateOfBirth: '1981-10-02' },
  { id: 'seed-dep-04', name: 'Manuel Bautista', phone: '09171230004', address: '12 Mabini St, Barangay Poblacion, Mandaluyong City', dateOfBirth: '1972-09-12' },
  { id: 'seed-dep-05', name: 'Lourdes Fernandez', phone: '09281230005', address: '8 Acacia Lane, Barangay Ugong, Valenzuela City', dateOfBirth: '1965-06-05' },
];

async function seedDepositors() {
  for (const d of DEPOSITORS) {
    await prisma.depositor.create({
      data: {
        id: seedUuid(d.id),
        name: d.name,
        email: d.name.toLowerCase().replace(/[^a-z]/g, '.') + '@example.ph',
        phone: d.phone,
        phoneNormalized: normalizePhone(d.phone),
        address: d.address,
        dateOfBirth: new Date(d.dateOfBirth),
        idType: 'NATIONAL_ID',
        idNumber: `PSN-${d.id.slice(-2)}-${Math.floor(1000 + Math.random() * 8999)}`,
      },
    });
  }
  console.log(`Depositors: ${DEPOSITORS.length}`);
}

type DepositPlan = {
  id: string;
  depositorId: string;
  amount: number;
  rate: number; // monthly decimal
  termMonths: number;
  monthsAgo: number;
  payoutType: 'MATURITY_ONLY' | 'SEMI_ANNUAL' | 'QUARTERLY' | 'MONTHLY_INTEREST';
  stage: 'ACTIVE' | 'WITHDRAWN' | 'CLOSED' | 'REVERSED';
};

const DEPOSIT_PLANS: DepositPlan[] = [
  { id: 'D-monthly', depositorId: 'seed-dep-01', amount: 250000, rate: 0.015, termMonths: 12, monthsAgo: 4, payoutType: 'MONTHLY_INTEREST', stage: 'ACTIVE' },
  { id: 'D-quarterly', depositorId: 'seed-dep-02', amount: 300000, rate: 0.045, termMonths: 12, monthsAgo: 6, payoutType: 'QUARTERLY', stage: 'REVERSED' },
  { id: 'D-maturity', depositorId: 'seed-dep-03', amount: 150000, rate: 0.02, termMonths: 12, monthsAgo: 3, payoutType: 'MATURITY_ONLY', stage: 'ACTIVE' },
  { id: 'D-monthly-2', depositorId: 'seed-dep-05', amount: 200000, rate: 0.012, termMonths: 12, monthsAgo: 5, payoutType: 'MONTHLY_INTEREST', stage: 'ACTIVE' },
  { id: 'D-withdrawn', depositorId: 'seed-dep-04', amount: 100000, rate: 0.02, termMonths: 12, monthsAgo: 5, payoutType: 'MATURITY_ONLY', stage: 'WITHDRAWN' },
  { id: 'D-closed', depositorId: 'seed-dep-03', amount: 120000, rate: 0.02, termMonths: 6, monthsAgo: 8, payoutType: 'QUARTERLY', stage: 'CLOSED' },
];

// Number of scheduled payouts to record for a given payout type over its elapsed life.
function payoutSchedule(payoutType: string, monthsElapsed: number): number {
  switch (payoutType) {
    case 'MONTHLY_INTEREST':
      return monthsElapsed;
    case 'QUARTERLY':
      return Math.floor(monthsElapsed / 3);
    case 'SEMI_ANNUAL':
      return Math.floor(monthsElapsed / 6);
    default:
      return 0; // MATURITY_ONLY
  }
}

async function seedDeposits() {
  const ids: Record<string, string> = {};
  for (let i = 0; i < DEPOSIT_PLANS.length; i++) {
    const plan = DEPOSIT_PLANS[i]!;
    const startDate = subMonths(TODAY, plan.monthsAgo);
    const deposit = await deposits.createDeposit(
      {
        depositorId: seedUuid(plan.depositorId),
        amount: plan.amount,
        expectedReturnRate: plan.rate,
        expectedReturnRatePeriod: 'MONTH',
        termMonths: plan.termMonths,
        startDate,
        depositType: 'REGULAR',
        payoutType: plan.payoutType,
        reference: `DEP-${plan.id}`,
      },
      OWNER(),
    );
    ids[plan.id] = deposit.id;
    await prisma.deposit.update({ where: { id: deposit.id }, data: { createdAt: startDate } });
    await backdateCapitalEntry('DEPOSIT', deposit.id, startDate);
    await backdateActivity(deposit.id, startDate);

    // Record interest-only payouts on the schedule (returnPortion = amount).
    const count = payoutSchedule(plan.payoutType, plan.monthsAgo);
    const periodMonths = plan.payoutType === 'QUARTERLY' ? 3 : plan.payoutType === 'SEMI_ANNUAL' ? 6 : 1;
    const periodRate = plan.rate * periodMonths;
    const payoutAmount = Number((plan.amount * periodRate).toFixed(2));
    for (let s = 1; s <= count; s++) {
      const paidAt = addMonths(startDate, s * periodMonths);
      if (paidAt > TODAY) break;
      const payout = await deposits.recordPayout(
        deposit.id,
        { amount: payoutAmount, principalPortion: 0, returnPortion: payoutAmount, paidAt, method: 'BANK_TRANSFER' },
        OWNER(),
      );
      await prisma.depositPayout.update({ where: { id: payout.id }, data: { createdAt: paidAt } });
      await backdateCapitalEntry('DEPOSIT_PAYOUT', payout.id, paidAt);
    }
    await backdateActivity(deposit.id, startDate);

    if (plan.stage === 'REVERSED') {
      const latest = await prisma.depositPayout.findFirst({
        where: { depositId: deposit.id, reversedAt: null },
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
      });
      if (latest) {
        await deposits.reversePayout(deposit.id, latest.id, { reason: 'Payout keyed to wrong depositor account.' }, OWNER());
      }
    }

    if (plan.stage === 'WITHDRAWN') {
      const withdrawnAt = subMonths(TODAY, 1);
      await deposits.withdrawDeposit(deposit.id, { notes: 'Depositor requested early withdrawal.' }, OWNER());
      await prisma.deposit.update({ where: { id: deposit.id }, data: { withdrawnAt } });
      await backdateCapitalEntry('DEPOSIT_WITHDRAWAL', deposit.id, withdrawnAt);
    }
    if (plan.stage === 'CLOSED') {
      const closedAt = subMonths(TODAY, 2);
      await deposits.closeDeposit(deposit.id, { notes: 'Matured — principal returned in full.' }, OWNER());
      await prisma.deposit.update({ where: { id: deposit.id }, data: { closedAt } });
      await backdateCapitalEntry('DEPOSIT_WITHDRAWAL', deposit.id, closedAt);
    }
  }
  console.log(`Deposits: ${DEPOSIT_PLANS.length}`);
  return ids;
}

// ── business capital via service ───────────────────────────────────────────────

async function seedFunds() {
  const initial = await funds.createFund(
    { amount: 3000000, dateAdded: subMonths(TODAY, 8), remarks: 'Initial owner capital infusion' },
    OWNER(),
  );
  await prisma.businessFund.update({ where: { id: initial.id }, data: { createdAt: subMonths(TODAY, 8) } });
  await backdateCapitalEntry('BUSINESS_CAPITAL', initial.id, subMonths(TODAY, 8));

  const topUp = await funds.createFund(
    { amount: 1000000, dateAdded: subMonths(TODAY, 2), remarks: 'Operating capital top-up' },
    OWNER(),
  );
  await prisma.businessFund.update({ where: { id: topUp.id }, data: { createdAt: subMonths(TODAY, 2) } });
  await backdateCapitalEntry('BUSINESS_CAPITAL', topUp.id, subMonths(TODAY, 2));

  console.log('Business funds: 2 (₱3,000,000 initial + ₱1,000,000 top-up)');
}

// ── main ─────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding realistic lending operation (as of 2026-07-06)...\n');

  await seedUsers();
  await clearAppData();
  await seedCompany();
  await seedFunds();
  await seedBorrowers();
  await seedDepositors();
  await seedLoans();
  await seedDeposits();

  console.log('\n─── Login credentials (password for all: password123) ───');
  for (const u of USERS) console.log(`  ${u.role.padEnd(8)} ${u.email}`);
  console.log('\nDone.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
