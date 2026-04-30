import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createBorrowerController,
  deleteBorrowerController,
  getBorrowerController,
  listBorrowersController,
  updateBorrowerController,
} from './borrowers.controller';
import {
  borrowerParamsSchema,
  createBorrowerSchema,
  listBorrowersSchema,
  updateBorrowerSchema,
} from './borrowers.schema';

export const borrowersRouter = Router();

borrowersRouter.get(
  '/',
  requireAuth,
  requireRole(['admin', 'manager', 'user']),
  validate(listBorrowersSchema, 'query'),
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

borrowersRouter.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  validate(borrowerParamsSchema, 'params'),
  deleteBorrowerController,
);
