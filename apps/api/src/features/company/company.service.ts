import { prisma } from '../../lib/prisma.js';
import type { UpdateCompanyInput } from './company.schema.js';

export async function getCompanyProfile() {
  const profile = await prisma.companyProfile.findUnique({ where: { id: 'default' } });
  return profile ?? { id: 'default', name: '', address: null, phone: null, email: null, website: null, taxId: null, logoUrl: null, updatedAt: new Date() };
}

export async function upsertCompanyProfile(data: UpdateCompanyInput) {
  return prisma.companyProfile.upsert({
    where: { id: 'default' },
    update: {
      name: data.name,
      address: data.address ?? null,
      phone: data.phone ?? null,
      email: data.email || null,
      website: data.website ?? null,
      taxId: data.taxId ?? null,
      logoUrl: data.logoUrl || null,
    },
    create: {
      id: 'default',
      name: data.name,
      address: data.address ?? null,
      phone: data.phone ?? null,
      email: data.email || null,
      website: data.website ?? null,
      taxId: data.taxId ?? null,
      logoUrl: data.logoUrl || null,
    },
  });
}
