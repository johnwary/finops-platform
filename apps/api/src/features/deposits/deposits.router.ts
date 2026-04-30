import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createDepositController,
  getDepositController,
  listDepositsController,
  updateDepositController,
  withdrawDepositController,
  closeDepositController,
  recordPayoutController,
  deleteDepositController,
} from './deposits.controller';
import {
  createDepositSchema,
  updateDepositSchema,
  withdrawDepositSchema,
  closeDepositSchema,
  recordPayoutSchema,
  listDepositsSchema,
  depositParamsSchema,
} from './deposits.schema';

export const depositsRouter = Router();

depositsRouter.use(requireAuth);

depositsRouter.get(
  '/',
  requireRole(['admin', 'manager', 'user']),
  validate(listDepositsSchema, 'query'),
  listDepositsController,
);

depositsRouter.get(
  '/:id',
  requireRole(['admin', 'manager', 'user']),
  validate(depositParamsSchema, 'params'),
  getDepositController,
);

depositsRouter.post(
  '/',
  requireRole(['admin', 'manager']),
  validate(createDepositSchema),
  createDepositController,
);

depositsRouter.patch(
  '/:id',
  requireRole(['admin', 'manager']),
  validate(depositParamsSchema, 'params'),
  validate(updateDepositSchema),
  updateDepositController,
);

depositsRouter.post(
  '/:id/withdraw',
  requireRole(['admin', 'manager']),
  validate(depositParamsSchema, 'params'),
  validate(withdrawDepositSchema),
  withdrawDepositController,
);

depositsRouter.post(
  '/:id/close',
  requireRole(['admin', 'manager']),
  validate(depositParamsSchema, 'params'),
  validate(closeDepositSchema),
  closeDepositController,
);

depositsRouter.post(
  '/:id/payouts',
  requireRole(['admin', 'manager']),
  validate(depositParamsSchema, 'params'),
  validate(recordPayoutSchema),
  recordPayoutController,
);

depositsRouter.delete(
  '/:id',
  requireRole('admin'),
  validate(depositParamsSchema, 'params'),
  deleteDepositController,
);
