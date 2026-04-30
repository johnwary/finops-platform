import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createLoanController,
  getLoanController,
  listLoansController,
  approveLoanController,
  disburseLoanController,
  cancelLoanController,
  recordPaymentController,
  defaultLoanController,
  deleteLoanController,
} from './loans.controller';
import {
  createLoanSchema,
  approveLoanSchema,
  disburseLoanSchema,
  cancelLoanSchema,
  recordPaymentSchema,
  defaultLoanSchema,
  listLoansSchema,
  loanParamsSchema,
} from './loans.schema';

export const loansRouter = Router();

loansRouter.use(requireAuth);

loansRouter.get(
  '/',
  requireRole(['admin', 'manager', 'user']),
  validate(listLoansSchema, 'query'),
  listLoansController,
);

loansRouter.get(
  '/:id',
  requireRole(['admin', 'manager', 'user']),
  validate(loanParamsSchema, 'params'),
  getLoanController,
);

loansRouter.post(
  '/',
  requireRole(['admin', 'manager']),
  validate(createLoanSchema),
  createLoanController,
);

loansRouter.post(
  '/:id/approve',
  requireRole(['admin', 'manager']),
  validate(loanParamsSchema, 'params'),
  validate(approveLoanSchema),
  approveLoanController,
);

loansRouter.post(
  '/:id/disburse',
  requireRole(['admin', 'manager']),
  validate(loanParamsSchema, 'params'),
  validate(disburseLoanSchema),
  disburseLoanController,
);

loansRouter.post(
  '/:id/cancel',
  requireRole(['admin', 'manager']),
  validate(loanParamsSchema, 'params'),
  validate(cancelLoanSchema),
  cancelLoanController,
);

loansRouter.post(
  '/:id/payments',
  requireRole(['admin', 'manager']),
  validate(loanParamsSchema, 'params'),
  validate(recordPaymentSchema),
  recordPaymentController,
);

loansRouter.post(
  '/:id/default',
  requireRole(['admin', 'manager']),
  validate(loanParamsSchema, 'params'),
  validate(defaultLoanSchema),
  defaultLoanController,
);

loansRouter.delete(
  '/:id',
  requireRole('admin'),
  validate(loanParamsSchema, 'params'),
  deleteLoanController,
);
