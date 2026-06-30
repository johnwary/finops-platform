import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { getCompanyController, updateCompanyController } from './company.controller.js';
import { updateCompanySchema } from './company.schema.js';

export const companyRouter = Router();

companyRouter.use(requireAuth);

companyRouter.get('/', getCompanyController);

companyRouter.put(
  '/',
  requireRole('admin'),
  validate(updateCompanySchema),
  updateCompanyController,
);
