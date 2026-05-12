import type { NextFunction, Request, Response } from 'express';
import { AppError, success, successList } from '../../lib/response.js';
import type {
  BorrowerParamsInput,
  CreateBorrowerInput,
  ListBorrowersInput,
  UpdateBorrowerInput,
} from './borrowers.schema.js';
import {
  createBorrower,
  getBorrower,
  listBorrowers,
  restoreBorrower,
  softDeleteBorrower,
  updateBorrower,
} from './borrowers.service.js';

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
    if (query.deleted && req.user!.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Only admins can list deleted borrowers.', 403);
    }
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

export async function restoreBorrowerController(req: Request, res: Response, next: NextFunction) {
  try {
    const params = req.validatedParams as BorrowerParamsInput;
    const borrower = await restoreBorrower(params.id, { id: req.user!.id });
    res.json(success(borrower));
  } catch (err) {
    next(err);
  }
}
