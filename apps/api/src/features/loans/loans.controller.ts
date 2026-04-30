import type { NextFunction, Request, Response } from 'express';
import { success, successList } from '../../lib/response';
import * as loansService from './loans.service';
import type {
  CreateLoanInput,
  DisburseLoanInput,
  CancelLoanInput,
  RecordPaymentInput,
  DefaultLoanInput,
  ListLoansInput,
} from './loans.schema';

export async function createLoanController(req: Request, res: Response, next: NextFunction) {
  try {
    const loan = await loansService.createLoan(
      req.validatedBody as CreateLoanInput,
      { id: req.user!.id },
    );
    res.status(201).json(success(loan));
  } catch (err) {
    next(err);
  }
}

export async function getLoanController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.validatedParams as { id: string };
    const loan = await loansService.getLoan(id);
    res.json(success(loan));
  } catch (err) {
    next(err);
  }
}

export async function listLoansController(req: Request, res: Response, next: NextFunction) {
  try {
    const { data, meta } = await loansService.listLoans(req.validatedQuery as ListLoansInput);
    res.json(successList(data, meta));
  } catch (err) {
    next(err);
  }
}

export async function approveLoanController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.validatedParams as { id: string };
    const loan = await loansService.approveLoan(id, { id: req.user!.id });
    res.json(success(loan));
  } catch (err) {
    next(err);
  }
}

export async function disburseLoanController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.validatedParams as { id: string };
    const loan = await loansService.disburseLoan(
      id,
      req.validatedBody as DisburseLoanInput,
      { id: req.user!.id },
    );
    res.json(success(loan));
  } catch (err) {
    next(err);
  }
}

export async function cancelLoanController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.validatedParams as { id: string };
    const loan = await loansService.cancelLoan(
      id,
      req.validatedBody as CancelLoanInput,
      { id: req.user!.id },
    );
    res.json(success(loan));
  } catch (err) {
    next(err);
  }
}

export async function recordPaymentController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.validatedParams as { id: string };
    const payment = await loansService.recordPayment(
      id,
      req.validatedBody as RecordPaymentInput,
      { id: req.user!.id },
    );
    res.status(201).json(success(payment));
  } catch (err) {
    next(err);
  }
}

export async function defaultLoanController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.validatedParams as { id: string };
    const loan = await loansService.defaultLoan(
      id,
      req.validatedBody as DefaultLoanInput,
      { id: req.user!.id },
    );
    res.json(success(loan));
  } catch (err) {
    next(err);
  }
}

export async function deleteLoanController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.validatedParams as { id: string };
    await loansService.softDeleteLoan(id, { id: req.user!.id });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
