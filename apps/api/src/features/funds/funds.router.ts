import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createFundController,
  withdrawFundController,
  listFundsController,
} from './funds.controller.js';
import {
  createFundSchema,
  withdrawFundSchema,
  listFundsSchema,
  fundParamsSchema,
} from './funds.schema.js';

export const fundsRouter = Router();

// Owner capital in/out — admin only by design (see docs/business-rules.md).
fundsRouter.use(requireAuth);
fundsRouter.use(requireRole('admin'));

fundsRouter.get('/', validate(listFundsSchema, 'query'), listFundsController);
fundsRouter.post('/', validate(createFundSchema), createFundController);
fundsRouter.post(
  '/:id/withdraw',
  validate(fundParamsSchema, 'params'),
  validate(withdrawFundSchema),
  withdrawFundController,
);
