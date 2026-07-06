import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { error } from '../../lib/response.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import type { ListLoansInput } from './loans.schema.js';
import {
  createLoanController,
  getLoanController,
  listLoansController,
  approveLoanController,
  disburseLoanController,
  cancelLoanController,
  recordPaymentController,
  reversePaymentController,
  lockLoanController,
  unlockLoanController,
  defaultLoanController,
  deleteLoanController,
  restoreLoanController,
  markLoanArrearsController,
  markLoanCurrentController,
  writeOffLoanController,
  restructureLoanController,
  listLoanActivityController,
} from './loans.controller.js';
import {
  createLoanSchema,
  approveLoanSchema,
  disburseLoanSchema,
  cancelLoanSchema,
  recordPaymentSchema,
  reversePaymentSchema,
  lockLoanSchema,
  paymentParamsSchema,
  defaultLoanSchema,
  markArrearsSchema,
  markCurrentSchema,
  writeOffLoanSchema,
  restructureLoanSchema,
  listLoanActivitySchema,
  listLoansSchema,
  loanParamsSchema,
} from './loans.schema.js';

export const loansRouter = Router();

loansRouter.use(requireAuth);

loansRouter.get(
  '/',
  requireRole(['admin', 'manager', 'user']),
  validate(listLoansSchema, 'query'),
  (req, res, next) => {
    if ((req.validatedQuery as ListLoansInput).deleted && req.user!.role !== 'admin') {
      res.status(403).json(error('FORBIDDEN', 'Only admins can list deleted loans.', 403));
      return;
    }
    next();
  },
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
  '/:id/payments/:paymentId/reverse',
  requireRole('admin'),
  validate(paymentParamsSchema, 'params'),
  validate(reversePaymentSchema),
  reversePaymentController,
);

loansRouter.post(
  '/:id/lock',
  requireRole('admin'),
  validate(loanParamsSchema, 'params'),
  validate(lockLoanSchema),
  lockLoanController,
);

loansRouter.post(
  '/:id/unlock',
  requireRole('admin'),
  validate(loanParamsSchema, 'params'),
  validate(lockLoanSchema),
  unlockLoanController,
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

loansRouter.post(
  '/:id/restore',
  requireRole('admin'),
  validate(loanParamsSchema, 'params'),
  restoreLoanController,
);

loansRouter.post(
  '/:id/mark-arrears',
  requireRole(['admin', 'manager']),
  validate(loanParamsSchema, 'params'),
  validate(markArrearsSchema),
  markLoanArrearsController,
);

loansRouter.post(
  '/:id/mark-current',
  requireRole(['admin', 'manager']),
  validate(loanParamsSchema, 'params'),
  validate(markCurrentSchema),
  markLoanCurrentController,
);

loansRouter.post(
  '/:id/write-off',
  requireRole('admin'),
  validate(loanParamsSchema, 'params'),
  validate(writeOffLoanSchema),
  writeOffLoanController,
);

loansRouter.post(
  '/:id/restructure',
  requireRole(['admin', 'manager']),
  validate(loanParamsSchema, 'params'),
  validate(restructureLoanSchema),
  restructureLoanController,
);

loansRouter.get(
  '/:id/activity',
  requireRole(['admin', 'manager', 'user']),
  validate(loanParamsSchema, 'params'),
  validate(listLoanActivitySchema, 'query'),
  listLoanActivityController,
);
