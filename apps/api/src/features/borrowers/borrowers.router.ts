import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { devDelay } from '../../middleware/dev-delay.middleware.js';
import { error } from '../../lib/response.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import type { ListBorrowersInput } from './borrowers.schema.js';
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
  (req, res, next) => {
    if ((req.validatedQuery as ListBorrowersInput).deleted && req.user!.role !== 'admin') {
      res.status(403).json(error('FORBIDDEN', 'Only admins can list deleted borrowers.', 403));
      return;
    }
    next();
  },
  devDelay(1500),
  listBorrowersController,
);

borrowersRouter.get(
  '/:id',
  requireAuth,
  requireRole(['admin', 'manager', 'user']),
  validate(borrowerParamsSchema, 'params'),
  devDelay(1500),
  getBorrowerController,
);

borrowersRouter.post(
  '/',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate(createBorrowerSchema),
  devDelay(1500),
  createBorrowerController,
);

borrowersRouter.patch(
  '/:id',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate(borrowerParamsSchema, 'params'),
  validate(updateBorrowerSchema),
  devDelay(1500),
  updateBorrowerController,
);

borrowersRouter.get(
  '/:id/activity',
  requireAuth,
  requireRole(['admin', 'manager', 'user']),
  validate(borrowerParamsSchema, 'params'),
  validate(listBorrowerActivitySchema, 'query'),
  devDelay(1500),
  listBorrowerActivityController,
);

borrowersRouter.post(
  '/:id/restore',
  requireAuth,
  requireRole('admin'),
  validate(borrowerParamsSchema, 'params'),
  devDelay(1500),
  restoreBorrowerController,
);

borrowersRouter.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  validate(borrowerParamsSchema, 'params'),
  devDelay(1500),
  deleteBorrowerController,
);
