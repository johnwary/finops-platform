import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireRole } from './rbac.middleware.js';
import { recordSecurityAudit } from '../lib/security-audit.js';

vi.mock('../lib/security-audit.js', () => ({
  recordSecurityAudit: vi.fn(),
}));

function response() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
}

describe('requireRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs forbidden access before returning 403', async () => {
    const req = {
      user: { id: 'user-1', role: 'user' },
      method: 'POST',
      originalUrl: '/api/v1/loans',
      ip: '127.0.0.1',
      get: vi.fn(),
    };
    const res = response();
    const next = vi.fn();

    await requireRole('admin')(req as never, res as never, next);

    expect(recordSecurityAudit).toHaveBeenCalledWith({
      action: 'FORBIDDEN_ACCESS',
      userId: 'user-1',
      req,
      metadata: {
        userRole: 'user',
        allowedRoles: ['admin'],
      },
    });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
