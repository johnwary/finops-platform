import { APIError, betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins';
import { prisma } from './prisma.js';
import { env } from './env.js';
import { recordSecurityAudit } from './security-audit.js';
import { sendPasswordResetEmail } from './email.js';

function inviteIdentifier(email: string) {
  return `invite:${email.toLowerCase()}`;
}

function envList(value: string | undefined) {
  return value
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
}

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  basePath: '/api/auth',
  trustedOrigins: [
    ...envList(env.WEB_URL),
    ...envList(env.CORS_ORIGIN),
    ...envList(env.BETTER_AUTH_TRUSTED_ORIGINS),
  ],
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    requireEmailVerification: false,
    autoSignIn: true,
    sendResetPassword: async ({ user, url }) => {
      const expiresAt = new Date(Date.now() + 3600 * 1000);
      await sendPasswordResetEmail(user.email, url, expiresAt);
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 2,
  },
  advanced: {
    useSecureCookies: env.NODE_ENV === 'production',
  },
  plugins: [admin({ defaultRole: 'user', adminRoles: ['admin'] })],
  databaseHooks: {
    session: {
      create: {
        after: async (session, ctx) => {
          if (ctx?.path !== '/sign-in/email') return;
          await recordSecurityAudit({
            action: 'USER_LOGIN',
            userId: session.userId,
            metadata: { authPath: ctx.path },
          });
        },
      },
    },
    user: {
      create: {
        before: async (user) => {
          const marker = await prisma.verification.findFirst({
            where: {
              identifier: inviteIdentifier(user.email),
              expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
          });

          if (!marker) {
            throw new APIError('FORBIDDEN', {
              message: 'Signup requires a valid invitation.',
            });
          }

          const { role } = JSON.parse(marker.value) as { role: string };

          await prisma.verification.delete({ where: { id: marker.id } });

          return {
            data: {
              ...user,
              role,
            },
          };
        },
        after: async (user) => {
          await prisma.invitation.updateMany({
            where: {
              email: user.email,
              status: 'PENDING',
            },
            data: {
              status: 'ACCEPTED',
              acceptedAt: new Date(),
            },
          });
        },
      },
    },
  },
});
