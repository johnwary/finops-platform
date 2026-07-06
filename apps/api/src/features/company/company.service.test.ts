import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const tx = {
    companyProfile: { upsert: vi.fn() },
    activityLog: { create: vi.fn() },
  };
  return {
    tx,
    prisma: {
      companyProfile: { findUnique: vi.fn() },
      $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(tx)),
    },
  };
});

vi.mock('../../lib/prisma', () => ({ prisma: mocks.prisma }));

import { getCompanyProfile, upsertCompanyProfile } from './company.service.js';

const actor = { id: 'user-1' };

describe('company.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCompanyProfile', () => {
    it('returns the stored default profile when a row exists', async () => {
      const stored = { id: 'default', name: 'Acme', address: 'Makati' };
      mocks.prisma.companyProfile.findUnique.mockResolvedValueOnce(stored);

      const result = await getCompanyProfile();

      expect(result).toBe(stored);
      expect(mocks.prisma.companyProfile.findUnique).toHaveBeenCalledWith({
        where: { id: 'default' },
      });
    });

    it('returns a synthetic empty default when no row exists', async () => {
      mocks.prisma.companyProfile.findUnique.mockResolvedValueOnce(null);

      const result = await getCompanyProfile();

      expect(result).toMatchObject({ id: 'default', name: '', address: null, logoUrl: null });
    });
  });

  describe('upsertCompanyProfile', () => {
    it('upserts the "default" singleton with normalized empty fields', async () => {
      mocks.tx.companyProfile.upsert.mockResolvedValueOnce({ id: 'default', name: 'Acme' });

      const result = await upsertCompanyProfile({ name: 'Acme', email: '' }, actor);

      expect(result).toMatchObject({ id: 'default', name: 'Acme' });
      const call = mocks.tx.companyProfile.upsert.mock.calls[0][0];
      expect(call.where).toEqual({ id: 'default' });
      // empty string email/logoUrl coerced to null; optional fields default to null
      expect(call.update).toMatchObject({ name: 'Acme', email: null, address: null });
      expect(call.create).toMatchObject({ id: 'default', name: 'Acme', email: null });
    });

    it('writes an audit log in the same transaction', async () => {
      mocks.tx.companyProfile.upsert.mockResolvedValueOnce({ id: 'default', name: 'Acme' });

      await upsertCompanyProfile({ name: 'Acme' }, actor);

      expect(mocks.tx.activityLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          category: 'AUDIT',
          action: 'COMPANY_PROFILE_UPDATED',
          targetId: 'default',
        },
      });
    });
  });
});
