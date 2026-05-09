import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const tx = {
    invitation: {
      create: vi.fn(),
      update: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
  };

  return {
    tx,
    prisma: {
      user: {
        findUnique: vi.fn(),
      },
      invitation: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      verification: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(tx)),
    },
    sendInviteEmail: vi.fn(),
  };
});

vi.mock('../../lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('../../lib/email', () => ({ sendInviteEmail: mocks.sendInviteEmail }));

import {
  createInvitation,
  revokeInvitation,
  validateAndStageInvite,
} from './invitations.service.js';

const actor = { id: 'admin-1', name: 'Admin User' };

describe('invitations.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.user.findUnique.mockResolvedValue(null);
    mocks.prisma.invitation.findFirst.mockResolvedValue(null);
    mocks.prisma.invitation.findUnique.mockResolvedValue(null);
    mocks.prisma.invitation.findMany.mockResolvedValue([]);
    mocks.prisma.invitation.update.mockResolvedValue(null);
    mocks.prisma.verification.findFirst.mockResolvedValue(null);
    mocks.prisma.verification.create.mockResolvedValue(null);
    mocks.prisma.verification.update.mockResolvedValue(null);
    mocks.tx.invitation.create.mockResolvedValue({
      id: 'invite-1',
      email: 'user@example.com',
      role: 'manager',
      token: 'token-1',
      expiresAt: new Date('2026-04-29T00:00:00.000Z'),
    });
    mocks.tx.invitation.update.mockResolvedValue({
      id: 'invite-1',
      status: 'REVOKED',
      revokedAt: new Date('2026-04-22T00:00:00.000Z'),
    });
    mocks.tx.activityLog.create.mockResolvedValue({ id: 'log-1' });
    mocks.sendInviteEmail.mockResolvedValue(undefined);
  });

  describe('createInvitation', () => {
    it('creates an invitation and activity log in a transaction, then sends email', async () => {
      const invitation = await createInvitation(
        { email: 'USER@EXAMPLE.COM', role: 'manager' },
        actor,
      );

      expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mocks.tx.invitation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'user@example.com',
          role: 'manager',
          invitedById: actor.id,
        }),
      });
      expect(mocks.tx.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: actor.id,
          category: 'AUDIT',
          action: 'INVITATION_CREATED',
          targetId: 'invite-1',
        }),
      });
      expect(mocks.sendInviteEmail).toHaveBeenCalledWith(
        'user@example.com',
        actor.name,
        'token-1',
        'manager',
        invitation.expiresAt,
      );
    });

    it('throws CONFLICT when a pending invite exists for the same email', async () => {
      mocks.prisma.invitation.findFirst.mockResolvedValue({ id: 'invite-1' });

      await expect(
        createInvitation({ email: 'user@example.com', role: 'user' }, actor),
      ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
    });

    it('throws CONFLICT when a user with the email already exists', async () => {
      mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

      await expect(
        createInvitation({ email: 'user@example.com', role: 'user' }, actor),
      ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
    });
  });

  describe('validateAndStageInvite', () => {
    it('creates a verification staging marker', async () => {
      mocks.prisma.invitation.findUnique.mockResolvedValue({
        id: 'invite-1',
        email: 'user@example.com',
        role: 'admin',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 60_000),
      });

      const result = await validateAndStageInvite('00000000-0000-4000-8000-000000000000');

      expect(result).toMatchObject({ email: 'user@example.com', role: 'admin' });
      expect(mocks.prisma.verification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          identifier: 'invite:user@example.com',
          value: JSON.stringify({ invitationId: 'invite-1', role: 'admin' }),
          expiresAt: expect.any(Date),
        }),
      });
    });

    it('updates an existing staging marker on repeated validation', async () => {
      mocks.prisma.invitation.findUnique.mockResolvedValue({
        id: 'invite-1',
        email: 'user@example.com',
        role: 'user',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 60_000),
      });
      mocks.prisma.verification.findFirst.mockResolvedValue({ id: 'marker-1' });

      await validateAndStageInvite('00000000-0000-4000-8000-000000000000');

      expect(mocks.prisma.verification.update).toHaveBeenCalledWith({
        where: { id: 'marker-1' },
        data: expect.objectContaining({
          value: JSON.stringify({ invitationId: 'invite-1', role: 'user' }),
          expiresAt: expect.any(Date),
        }),
      });
    });

    it.each([
      ['missing', null],
      ['revoked', { status: 'REVOKED', expiresAt: new Date(Date.now() + 60_000) }],
      ['accepted', { status: 'ACCEPTED', expiresAt: new Date(Date.now() + 60_000) }],
    ])('throws INVITE_INVALID for %s tokens', async (_caseName, invitation) => {
      mocks.prisma.invitation.findUnique.mockResolvedValue(
        invitation
          ? {
              id: 'invite-1',
              email: 'user@example.com',
              role: 'user',
              ...invitation,
            }
          : null,
      );

      await expect(
        validateAndStageInvite('00000000-0000-4000-8000-000000000000'),
      ).rejects.toMatchObject({ code: 'INVITE_INVALID' });
    });

    it('marks expired invites as EXPIRED and throws INVITE_INVALID', async () => {
      mocks.prisma.invitation.findUnique.mockResolvedValue({
        id: 'invite-1',
        email: 'user@example.com',
        role: 'user',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 60_000),
      });

      await expect(
        validateAndStageInvite('00000000-0000-4000-8000-000000000000'),
      ).rejects.toMatchObject({ code: 'INVITE_INVALID' });
      expect(mocks.prisma.invitation.update).toHaveBeenCalledWith({
        where: { id: 'invite-1' },
        data: { status: 'EXPIRED' },
      });
    });
  });

  describe('revokeInvitation', () => {
    it('sets REVOKED and writes an activity log', async () => {
      mocks.prisma.invitation.findUnique.mockResolvedValue({
        id: 'invite-1',
        email: 'user@example.com',
        role: 'manager',
        status: 'PENDING',
        deletedAt: null,
      });

      await revokeInvitation('invite-1', actor);

      expect(mocks.tx.invitation.update).toHaveBeenCalledWith({
        where: { id: 'invite-1' },
        data: {
          status: 'REVOKED',
          revokedAt: expect.any(Date),
        },
      });
      expect(mocks.tx.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: actor.id,
          action: 'INVITATION_REVOKED',
          targetId: 'invite-1',
        }),
      });
    });

    it('throws CONFLICT if the invitation is already accepted', async () => {
      mocks.prisma.invitation.findUnique.mockResolvedValue({
        id: 'invite-1',
        status: 'ACCEPTED',
        deletedAt: null,
      });

      await expect(revokeInvitation('invite-1', actor)).rejects.toMatchObject({
        code: 'CONFLICT',
        status: 409,
      });
    });
  });
});
