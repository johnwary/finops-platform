import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { devDelay } from '../../middleware/dev-delay.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createBorrowerController,
  deleteBorrowerController,
  getBorrowerController,
  listBorrowerActivityController,
  listBorrowersController,
  restoreBorrowerController,
  updateBorrowerController,
} from './borrowers.controller.js';
import {
  borrowerParamsSchema,
  createBorrowerSchema,
  listBorrowerActivitySchema,
  listBorrowersSchema,
  updateBorrowerSchema,
} from './borrowers.schema.js';

export const borrowersRouter = Router();

borrowersRouter.get(
  '/',
  requireAuth,
  requireRole(['admin', 'manager', 'user']),
  validate(listBorrowersSchema, 'query'),
  devDelay(1500),
  listBorrowersController,
);

borrowersRouter.get(
  '/:id',
  requireAuth,
  requireRole(['admin', 'manager', 'user']),
  validate(borrowerParamsSchema, 'params'),
  getBorrowerController,
);

borrowersRouter.post(
  '/',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate(createBorrowerSchema),
  createBorrowerController,
);

borrowersRouter.patch(
  '/:id',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate(borrowerParamsSchema, 'params'),
  validate(updateBorrowerSchema),
  updateBorrowerController,
);

borrowersRouter.get(
  '/:id/activity',
  requireAuth,
  requireRole(['admin', 'manager', 'user']),
  validate(borrowerParamsSchema, 'params'),
  validate(listBorrowerActivitySchema, 'query'),
  listBorrowerActivityController,
);

borrowersRouter.post(
  '/:id/restore',
  requireAuth,
  requireRole('admin'),
  validate(borrowerParamsSchema, 'params'),
  restoreBorrowerController,
);

borrowersRouter.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  validate(borrowerParamsSchema, 'params'),
  deleteBorrowerController,
);
