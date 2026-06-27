import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { listActivityLogsController } from './activity.controller.js';
import { listActivityLogsSchema } from './activity.schema.js';

export const activityRouter = Router();

activityRouter.get(
  '/',
  requireAuth,
  requireRole('admin'),
  validate(listActivityLogsSchema, 'query'),
  listActivityLogsController,
);
