import type { Request, Response } from 'express';
import { success, successList } from '../../lib/response.js';
import type {
  BorrowerParamsInput,
  CreateBorrowerInput,
  ListBorrowerActivityInput,
  ListBorrowersInput,
  UpdateBorrowerInput,
} from './borrowers.schema.js';
import {
  createBorrower,
  getBorrower,
  listBorrowerActivity,
  listBorrowers,
  restoreBorrower,
  softDeleteBorrower,
  updateBorrower,
} from './borrowers.service.js';

export async function createBorrowerController(req: Request, res: Response) {
  const body = req.validatedBody as CreateBorrowerInput;
  const borrower = await createBorrower(body, { id: req.user!.id });
  res.status(201).json(success(borrower));
}

export async function getBorrowerController(req: Request, res: Response) {
  const params = req.validatedParams as BorrowerParamsInput;
  const borrower = await getBorrower(params.id);
  res.json(success(borrower));
}

export async function listBorrowersController(req: Request, res: Response) {
  const query = req.validatedQuery as ListBorrowersInput;
  const { data, meta } = await listBorrowers(query);
  res.json(successList(data, meta));
}

export async function updateBorrowerController(req: Request, res: Response) {
  const params = req.validatedParams as BorrowerParamsInput;
  const body = req.validatedBody as UpdateBorrowerInput;
  const borrower = await updateBorrower(params.id, body, { id: req.user!.id });
  res.json(success(borrower));
}

export async function deleteBorrowerController(req: Request, res: Response) {
  const params = req.validatedParams as BorrowerParamsInput;
  await softDeleteBorrower(params.id, { id: req.user!.id });
  res.status(204).send();
}

export async function listBorrowerActivityController(req: Request, res: Response) {
  const params = req.validatedParams as BorrowerParamsInput;
  const query = req.validatedQuery as ListBorrowerActivityInput;
  const { data, meta } = await listBorrowerActivity(params.id, query, { role: req.user!.role });
  res.json(successList(data, meta));
}

export async function restoreBorrowerController(req: Request, res: Response) {
  const params = req.validatedParams as BorrowerParamsInput;
  const borrower = await restoreBorrower(params.id, { id: req.user!.id });
  res.json(success(borrower));
}
