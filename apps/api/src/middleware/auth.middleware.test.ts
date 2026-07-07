import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock('../lib/auth.js', () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

import { requireAuth } from './auth.middleware.js';

function response() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
}

const authSession = {
  id: 'session-1',
  userId: 'user-1',
  expiresAt: new Date('2026-07-08T00:00:00.000Z'),
  token: 'token-1',
  createdAt: new Date('2026-07-07T00:00:00.000Z'),
  updatedAt: new Date('2026-07-07T00:00:00.000Z'),
};

function authUser(overrides: Partial<NonNullable<Request['user']>> = {}) {
  return {
    id: 'user-1',
    name: 'User One',
    email: 'user@example.com',
    emailVerified: true,
    image: null,
    role: 'user',
    banned: false,
    banReason: null,
    banExpires: null,
    createdAt: new Date('2026-07-07T00:00:00.000Z'),
    updatedAt: new Date('2026-07-07T00:00:00.000Z'),
    ...overrides,
  };
}

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-07T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 401 when there is no session', async () => {
    mocks.getSession.mockResolvedValueOnce(null);
    const req = { headers: {} };
    const res = response();
    const next = vi.fn();

    await requireAuth(req as never, res as never, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.', status: 401 },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a banned user with an active session', async () => {
    mocks.getSession.mockResolvedValueOnce({
      session: authSession,
      user: authUser({ banned: true }),
    });
    const req = { headers: {} };
    const res = response();
    const next = vi.fn();

    await requireAuth(req as never, res as never, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'BANNED_USER', message: 'Your account is banned.', status: 403 },
    });
    expect((req as Request).user).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a session after the ban expiry has passed', async () => {
    const user = authUser({
      banned: true,
      banExpires: new Date('2026-07-06T00:00:00.000Z'),
    });
    mocks.getSession.mockResolvedValueOnce({ session: authSession, user });
    const req = { headers: {} };
    const res = response();
    const next = vi.fn();

    await requireAuth(req as never, res as never, next);

    expect(req).toMatchObject({ user, session: authSession });
    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });
});
