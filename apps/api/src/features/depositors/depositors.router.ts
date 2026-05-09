import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createDepositorController,
  getDepositorController,
  listDepositorsController,
  updateDepositorController,
  deleteDepositorController,
} from './depositors.controller.js';
import {
  createDepositorSchema,
  updateDepositorSchema,
  listDepositorsSchema,
  depositorParamsSchema,
} from './depositors.schema.js';

export const depositorsRouter = Router();

depositorsRouter.use(requireAuth);

depositorsRouter.get(
  '/',
  requireRole(['admin', 'manager', 'user']),
  validate(listDepositorsSchema, 'query'),
  listDepositorsController,
);

depositorsRouter.get(
  '/:id',
  requireRole(['admin', 'manager', 'user']),
  validate(depositorParamsSchema, 'params'),
  getDepositorController,
);

depositorsRouter.post(
  '/',
  requireRole(['admin', 'manager']),
  validate(createDepositorSchema),
  createDepositorController,
);

depositorsRouter.patch(
  '/:id',
  requireRole(['admin', 'manager']),
  validate(depositorParamsSchema, 'params'),
  validate(updateDepositorSchema),
  updateDepositorController,
);

depositorsRouter.delete(
  '/:id',
  requireRole('admin'),
  validate(depositorParamsSchema, 'params'),
  deleteDepositorController,
);
