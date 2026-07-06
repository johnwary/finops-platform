import type { Request, Response } from 'express';
import { success } from '../../lib/response.js';
import { getCompanyProfile, upsertCompanyProfile } from './company.service.js';
import type { UpdateCompanyInput } from './company.schema.js';

export async function getCompanyController(req: Request, res: Response) {
  const profile = await getCompanyProfile();
  res.json(success(profile));
}

export async function updateCompanyController(req: Request, res: Response) {
  const profile = await upsertCompanyProfile(req.validatedBody as UpdateCompanyInput, { id: req.user!.id });
  res.json(success(profile));
}
