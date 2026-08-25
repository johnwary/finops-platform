import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  class APIError extends Error {}
  return {
    APIError,
    betterAuth: vi.fn((options) => options),
    prisma: {
      verification: { findFirst: vi.fn(), delete: vi.fn() },
      invitation: { updateMany: vi.fn() },
    },
  };
});

vi.mock('better-auth', () => ({ APIError: mocks.APIError, betterAuth: mocks.betterAuth }));
vi.mock('better-auth/adapters/prisma', () => ({ prismaAdapter: vi.fn() }));
vi.mock('better-auth/plugins', () => ({ admin: vi.fn() }));
vi.mock('./prisma.js', () => ({ prisma: mocks.prisma }));
vi.mock('./env.js', () => ({
  env: { BETTER_AUTH_URL: 'http://localhost:3000', BETTER_AUTH_SECRET: 'test', NODE_ENV: 'test' },
}));
vi.mock('./security-audit.js', () => ({ recordSecurityAudit: vi.fn() }));
vi.mock('./email.js', () => ({ sendPasswordResetEmail: vi.fn() }));

import './auth.js';

describe('invite signup hook', () => {
  const before = mocks.betterAuth.mock.calls[0]![0].databaseHooks.user.create.before;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.verification.findFirst.mockResolvedValue({
      id: 'marker-1',
      value: JSON.stringify({ invitationId: 'invite-1', role: 'manager' }),
    });
    mocks.prisma.invitation.updateMany.mockResolvedValue({ count: 1 });
  });

  it('rejects a staged marker when its invitation was revoked', async () => {
    mocks.prisma.invitation.updateMany.mockResolvedValue({ count: 0 });

    await expect(before({ email: 'user@example.com' })).rejects.toBeInstanceOf(mocks.APIError);
    expect(mocks.prisma.verification.delete).not.toHaveBeenCalled();
  });

  it('claims the matching pending invitation before assigning its role', async () => {
    const result = await before({ email: 'user@example.com' });

    expect(result.data.role).toBe('manager');
    expect(mocks.prisma.invitation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'invite-1', email: 'user@example.com', status: 'PENDING' }),
      }),
    );
    expect(mocks.prisma.verification.delete).toHaveBeenCalledWith({ where: { id: 'marker-1' } });
  });
});
