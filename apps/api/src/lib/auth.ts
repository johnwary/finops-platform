import { APIError, betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins';
import { prisma } from './prisma';

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
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  basePath: '/api/auth',
  trustedOrigins: [
    ...envList(process.env.WEB_URL),
    ...envList(process.env.CORS_ORIGIN),
    ...envList(process.env.BETTER_AUTH_TRUSTED_ORIGINS),
  ],
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    requireEmailVerification: false,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 2,
  },
  plugins: [admin({ defaultRole: 'user', adminRoles: ['admin'] })],
  databaseHooks: {
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
