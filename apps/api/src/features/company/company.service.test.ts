import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prisma: {
    companyProfile: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock('../../lib/prisma', () => ({ prisma: mocks.prisma }));

import { getCompanyProfile, upsertCompanyProfile } from './company.service.js';

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
      mocks.prisma.companyProfile.upsert.mockResolvedValueOnce({ id: 'default', name: 'Acme' });

      const result = await upsertCompanyProfile({ name: 'Acme', email: '' });

      expect(result).toMatchObject({ id: 'default', name: 'Acme' });
      const call = mocks.prisma.companyProfile.upsert.mock.calls[0][0];
      expect(call.where).toEqual({ id: 'default' });
      // empty string email/logoUrl coerced to null; optional fields default to null
      expect(call.update).toMatchObject({ name: 'Acme', email: null, address: null });
      expect(call.create).toMatchObject({ id: 'default', name: 'Acme', email: null });
    });
  });
});
