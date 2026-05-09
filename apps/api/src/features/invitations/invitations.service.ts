import { addDays, addMinutes } from 'date-fns';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/response.js';
import { sendInviteEmail } from '../../lib/email.js';
import type { CreateInvitationInput, ListInvitationsInput } from './invitations.schema.js';

interface Actor {
  id: string;
  name: string;
}

function inviteIdentifier(email: string) {
  return `invite:${email.toLowerCase()}`;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function createInvitation(data: CreateInvitationInput, actor: Actor) {
  const email = normalizeEmail(data.email);

  const [existingUser, existingPendingInvite] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.invitation.findFirst({
      where: {
        email,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    }),
  ]);

  if (existingUser) {
    throw new AppError('CONFLICT', 'A user with this email already exists.', 409);
  }

  if (existingPendingInvite) {
    throw new AppError('CONFLICT', 'A pending invitation already exists for this email.', 409);
  }

  const invitation = await prisma.$transaction(async (tx) => {
    const created = await tx.invitation.create({
      data: {
        email,
        role: data.role,
        invitedById: actor.id,
        expiresAt: addDays(new Date(), 7),
      },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'INVITATION_CREATED',
        targetId: created.id,
        metadata: {
          email,
          role: data.role,
        },
      },
    });

    return created;
  });

  await sendInviteEmail(email, actor.name, invitation.token, invitation.role, invitation.expiresAt);

  return invitation;
}

export async function validateAndStageInvite(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
  });

  if (!invitation || invitation.status !== 'PENDING') {
    throw new AppError('INVITE_INVALID', 'Invitation is invalid or no longer available.', 400);
  }

  const now = new Date();

  if (invitation.expiresAt <= now) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    });
    throw new AppError('INVITE_INVALID', 'Invitation has expired.', 400);
  }

  const expiresAt = addMinutes(now, 10);
  const identifier = inviteIdentifier(invitation.email);
  const value = JSON.stringify({
    invitationId: invitation.id,
    role: invitation.role,
  });

  const existingMarker = await prisma.verification.findFirst({
    where: { identifier },
    orderBy: { createdAt: 'desc' },
  });

  if (existingMarker) {
    await prisma.verification.update({
      where: { id: existingMarker.id },
      data: { value, expiresAt },
    });
  } else {
    await prisma.verification.create({
      data: { id: randomUUID(), identifier, value, expiresAt },
    });
  }

  return {
    email: invitation.email,
    role: invitation.role,
    expiresAt,
  };
}

export async function listInvitations({ cursor, limit, status }: ListInvitationsInput) {
  const invitations = await prisma.invitation.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    take: limit + 1,
    include: {
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const hasMore = invitations.length > limit;
  const data = hasMore ? invitations.slice(0, limit) : invitations;
  const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;

  return {
    data,
    meta: {
      nextCursor,
      hasMore,
      limit,
    },
  };
}

export async function revokeInvitation(id: string, actor: Actor) {
  const invitation = await prisma.invitation.findUnique({ where: { id } });

  if (!invitation || invitation.deletedAt) {
    throw new AppError('NOT_FOUND', 'Invitation not found.', 404);
  }

  if (invitation.status === 'ACCEPTED') {
    throw new AppError('CONFLICT', 'Accepted invitations cannot be revoked.', 409);
  }

  if (invitation.status === 'REVOKED') {
    throw new AppError('CONFLICT', 'Invitation is already revoked.', 409);
  }

  return prisma.$transaction(async (tx) => {
    const revoked = await tx.invitation.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'INVITATION_REVOKED',
        targetId: id,
        metadata: {
          email: invitation.email,
          role: invitation.role,
        },
      },
    });

    return revoked;
  });
}
