import type { Request, Response } from 'express';
import { success, successList } from '../../lib/response.js';
import * as loansService from './loans.service.js';
import type {
  CreateLoanInput,
  ApproveLoanInput,
  DisburseLoanInput,
  CancelLoanInput,
  RecordPaymentInput,
  ReversePaymentInput,
  LockLoanInput,
  DefaultLoanInput,
  MarkArrearsInput,
  MarkCurrentInput,
  WriteOffLoanInput,
  RestructureLoanInput,
  ListLoansInput,
  ListLoanActivityInput,
} from './loans.schema.js';

export async function createLoanController(req: Request, res: Response) {
  const loan = await loansService.createLoan(
    req.validatedBody as CreateLoanInput,
    { id: req.user!.id },
  );
  res.status(201).json(success(loan));
}

export async function getLoanController(req: Request, res: Response) {
  const { id } = req.validatedParams as { id: string };
  const loan = await loansService.getLoan(id);
  res.json(success(loan));
}

export async function listLoansController(req: Request, res: Response) {
  const { data, meta } = await loansService.listLoans(req.validatedQuery as ListLoansInput);
  res.json(successList(data, meta));
}

export async function approveLoanController(req: Request, res: Response) {
  const { id } = req.validatedParams as { id: string };
  const loan = await loansService.approveLoan(id, req.validatedBody as ApproveLoanInput, { id: req.user!.id });
  res.json(success(loan));
}

export async function disburseLoanController(req: Request, res: Response) {
  const { id } = req.validatedParams as { id: string };
  const loan = await loansService.disburseLoan(
    id,
    req.validatedBody as DisburseLoanInput,
    { id: req.user!.id },
  );
  res.json(success(loan));
}

export async function cancelLoanController(req: Request, res: Response) {
  const { id } = req.validatedParams as { id: string };
  const loan = await loansService.cancelLoan(
    id,
    req.validatedBody as CancelLoanInput,
    { id: req.user!.id },
  );
  res.json(success(loan));
}

export async function recordPaymentController(req: Request, res: Response) {
  const { id } = req.validatedParams as { id: string };
  const payment = await loansService.recordPayment(
    id,
    req.validatedBody as RecordPaymentInput,
    { id: req.user!.id },
  );
  res.status(201).json(success(payment));
}

export async function reversePaymentController(req: Request, res: Response) {
  const { id, paymentId } = req.validatedParams as { id: string; paymentId: string };
  const payment = await loansService.reversePayment(
    id,
    paymentId,
    req.validatedBody as ReversePaymentInput,
    { id: req.user!.id },
  );
  res.json(success(payment));
}

export async function lockLoanController(req: Request, res: Response) {
  const { id } = req.validatedParams as { id: string };
  const loan = await loansService.lockLoan(id, req.validatedBody as LockLoanInput, { id: req.user!.id });
  res.json(success(loan));
}

export async function unlockLoanController(req: Request, res: Response) {
  const { id } = req.validatedParams as { id: string };
  const loan = await loansService.unlockLoan(id, req.validatedBody as LockLoanInput, { id: req.user!.id });
  res.json(success(loan));
}

export async function defaultLoanController(req: Request, res: Response) {
  const { id } = req.validatedParams as { id: string };
  const loan = await loansService.defaultLoan(
    id,
    req.validatedBody as DefaultLoanInput,
    { id: req.user!.id },
  );
  res.json(success(loan));
}

export async function deleteLoanController(req: Request, res: Response) {
  const { id } = req.validatedParams as { id: string };
  await loansService.softDeleteLoan(id, { id: req.user!.id });
  res.status(204).send();
}

export async function restoreLoanController(req: Request, res: Response) {
  const { id } = req.validatedParams as { id: string };
  const loan = await loansService.restoreLoan(id, { id: req.user!.id });
  res.json(success(loan));
}

export async function markLoanArrearsController(req: Request, res: Response) {
  const { id } = req.validatedParams as { id: string };
  const loan = await loansService.markLoanArrears(id, req.validatedBody as MarkArrearsInput, { id: req.user!.id });
  res.json(success(loan));
}

export async function markLoanCurrentController(req: Request, res: Response) {
  const { id } = req.validatedParams as { id: string };
  const loan = await loansService.markLoanCurrent(id, req.validatedBody as MarkCurrentInput, { id: req.user!.id });
  res.json(success(loan));
}

export async function writeOffLoanController(req: Request, res: Response) {
  const { id } = req.validatedParams as { id: string };
  const loan = await loansService.writeOffLoan(id, req.validatedBody as WriteOffLoanInput, { id: req.user!.id });
  res.json(success(loan));
}

export async function restructureLoanController(req: Request, res: Response) {
  const { id } = req.validatedParams as { id: string };
  const loan = await loansService.restructureLoan(id, req.validatedBody as RestructureLoanInput, { id: req.user!.id });
  res.json(success(loan));
}

export async function listLoanActivityController(req: Request, res: Response) {
  const { id } = req.validatedParams as { id: string };
  const { data, meta } = await loansService.listLoanActivity(
    id,
    req.validatedQuery as ListLoanActivityInput,
    { role: req.user!.role },
  );
  res.json(successList(data, meta));
}
