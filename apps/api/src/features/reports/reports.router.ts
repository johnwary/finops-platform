import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  summaryController,
  overdueController,
  portfolioAtRiskController,
} from './reports.controller.js';
import { overdueSchema, periodSchema } from './reports.schema.js';

export const reportsRouter = Router();

reportsRouter.use(requireAuth);
reportsRouter.use(requireRole(['admin', 'manager']));

reportsRouter.get('/summary', validate(periodSchema, 'query'), summaryController);
reportsRouter.get('/overdue', validate(overdueSchema, 'query'), overdueController);
reportsRouter.get('/portfolio-at-risk', portfolioAtRiskController);
