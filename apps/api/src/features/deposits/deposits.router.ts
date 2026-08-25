import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createDepositController,
  getDepositController,
  listDepositsController,
  updateDepositController,
  withdrawDepositController,
  closeDepositController,
  recordPayoutController,
  reversePayoutController,
  deleteDepositController,
} from './deposits.controller.js';
import {
  createDepositSchema,
  updateDepositSchema,
  withdrawDepositSchema,
  closeDepositSchema,
  recordPayoutSchema,
  reversePayoutSchema,
  payoutParamsSchema,
  listDepositsSchema,
  depositParamsSchema,
} from './deposits.schema.js';

export const depositsRouter = Router();

depositsRouter.use(requireAuth);

depositsRouter.get(
  '/',
  requireRole(['admin', 'manager']),
  validate(listDepositsSchema, 'query'),
  listDepositsController,
);

depositsRouter.get(
  '/:id',
  requireRole(['admin', 'manager']),
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

depositsRouter.post(
  '/:id/payouts/:payoutId/reverse',
  requireRole('admin'),
  validate(payoutParamsSchema, 'params'),
  validate(reversePayoutSchema),
  reversePayoutController,
);

depositsRouter.delete(
  '/:id',
  requireRole('admin'),
  validate(depositParamsSchema, 'params'),
  deleteDepositController,
);
