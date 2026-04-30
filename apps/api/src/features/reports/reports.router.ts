import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  summaryController,
  overdueController,
  portfolioAtRiskController,
} from './reports.controller';
import { periodSchema } from './reports.schema';

export const reportsRouter = Router();

reportsRouter.use(requireAuth);
reportsRouter.use(requireRole(['admin', 'manager']));

reportsRouter.get('/summary', validate(periodSchema, 'query'), summaryController);
reportsRouter.get('/overdue', overdueController);
reportsRouter.get('/portfolio-at-risk', portfolioAtRiskController);
