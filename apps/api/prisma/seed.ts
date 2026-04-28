import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaPg(process.env.DATABASE_URL ?? '');
const prisma = new PrismaClient({ adapter });

const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com').toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD ?? 'changeme123';
const name = process.env.SEED_ADMIN_NAME ?? 'Super Admin';

async function main() {
  const hashed = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'admin', emailVerified: true },
    create: {
      id: randomUUID(),
      email,
      name,
      role: 'admin',
      emailVerified: true,
    },
  });

  const account = await prisma.account.findFirst({
    where: {
      providerId: 'credential',
      accountId: email,
    },
  });

  if (account) {
    await prisma.account.update({
      where: { id: account.id },
      data: {
        userId: user.id,
        password: hashed,
      },
    });
  } else {
    await prisma.account.create({
      data: {
        id: randomUUID(),
        accountId: email,
        providerId: 'credential',
        userId: user.id,
        password: hashed,
      },
    });
  }

  console.log(`Seeded admin: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
