import type { NextFunction, Request, Response } from 'express';
import { success, successList } from '../../lib/response';
import type {
  BorrowerParamsInput,
  CreateBorrowerInput,
  ListBorrowersInput,
  UpdateBorrowerInput,
} from './borrowers.schema';
import {
  createBorrower,
  getBorrower,
  listBorrowers,
  softDeleteBorrower,
  updateBorrower,
} from './borrowers.service';

export async function createBorrowerController(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.validatedBody as CreateBorrowerInput;
    const borrower = await createBorrower(body, { id: req.user!.id });
    res.status(201).json(success(borrower));
  } catch (err) {
    next(err);
  }
}

export async function getBorrowerController(req: Request, res: Response, next: NextFunction) {
  try {
    const params = req.validatedParams as BorrowerParamsInput;
    const borrower = await getBorrower(params.id);
    res.json(success(borrower));
  } catch (err) {
    next(err);
  }
}

export async function listBorrowersController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.validatedQuery as ListBorrowersInput;
    const { data, meta } = await listBorrowers(query);
    res.json(successList(data, meta));
  } catch (err) {
    next(err);
  }
}

export async function updateBorrowerController(req: Request, res: Response, next: NextFunction) {
  try {
    const params = req.validatedParams as BorrowerParamsInput;
    const body = req.validatedBody as UpdateBorrowerInput;
    const borrower = await updateBorrower(params.id, body, { id: req.user!.id });
    res.json(success(borrower));
  } catch (err) {
    next(err);
  }
}

export async function deleteBorrowerController(req: Request, res: Response, next: NextFunction) {
  try {
    const params = req.validatedParams as BorrowerParamsInput;
    await softDeleteBorrower(params.id, { id: req.user!.id });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
