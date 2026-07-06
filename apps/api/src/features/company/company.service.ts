import { prisma } from '../../lib/prisma.js';
import type { UpdateCompanyInput } from './company.schema.js';

type Actor = { id: string };

export async function getCompanyProfile() {
  const profile = await prisma.companyProfile.findUnique({ where: { id: 'default' } });
  return profile ?? { id: 'default', name: '', address: null, phone: null, email: null, website: null, taxId: null, logoUrl: null, updatedAt: new Date() };
}

export async function upsertCompanyProfile(data: UpdateCompanyInput, actor: Actor) {
  const fields = {
    name: data.name,
    address: data.address ?? null,
    phone: data.phone ?? null,
    email: data.email || null,
    website: data.website ?? null,
    taxId: data.taxId ?? null,
    logoUrl: data.logoUrl || null,
  };
  return prisma.$transaction(async (tx) => {
    const profile = await tx.companyProfile.upsert({
      where: { id: 'default' },
      update: fields,
      create: { id: 'default', ...fields },
    });
    await tx.activityLog.create({
      data: {
        userId: actor.id,
        category: 'AUDIT',
        action: 'COMPANY_PROFILE_UPDATED',
        targetId: profile.id,
      },
    });
    return profile;
  });
}
