// First-admin bootstrap for a fresh production install.
//
// Signup is invite-only and invitations require an admin — this script breaks
// that chicken-and-egg once: it stages an invite marker (the same mechanism the
// invite flow uses) and signs the admin up through better-auth, so password
// hashing and hooks behave exactly like a normal signup.
//
// Usage (env vars required):
//   BOOTSTRAP_ADMIN_EMAIL=owner@company.com \
//   BOOTSTRAP_ADMIN_PASSWORD='a-strong-password' \
//   BOOTSTRAP_ADMIN_NAME='Owner Name' \
//   node dist/scripts/bootstrap-admin.js        (prod image)
//   pnpm bootstrap:admin                        (dev)
//
// Aborts safely if any admin already exists.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { addMinutes } from 'date-fns';
import { prisma } from '../lib/prisma.js';
import { auth } from '../lib/auth.js';

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'Administrator';

  if (!email || !password) {
    console.error('BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  const existingAdmin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (existingAdmin) {
    console.log(`An admin already exists (${existingAdmin.email}). Nothing to do.`);
    process.exit(0);
  }

  // Stage the invite marker the signup before-hook expects (same shape as
  // invitations.service validateAndStageInvite).
  await prisma.verification.create({
    data: {
      id: randomUUID(),
      identifier: `invite:${email}`,
      value: JSON.stringify({ invitationId: 'bootstrap', role: 'admin' }),
      expiresAt: addMinutes(new Date(), 10),
    },
  });

  await auth.api.signUpEmail({ body: { email, password, name } });

  await prisma.activityLog.create({
    data: {
      actorType: 'SYSTEM',
      category: 'AUDIT',
      action: 'ADMIN_BOOTSTRAPPED',
      metadata: { email },
    },
  });

  console.log(`Admin account created: ${email}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
