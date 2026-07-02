import type { NextFunction, Request, Response } from 'express';
import { success, successList } from '../../lib/response.js';
import type { CreateFundInput, WithdrawFundInput, ListFundsInput } from './funds.schema.js';
import { createFund, withdrawFund, listFunds } from './funds.service.js';

export async function createFundController(req: Request, res: Response, next: NextFunction) {
  try {
    const fund = await createFund(req.validatedBody as CreateFundInput, { id: req.user!.id });
    res.status(201).json(success(fund));
  } catch (err) {
    next(err);
  }
}

export async function withdrawFundController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.validatedParams as { id: string };
    const fund = await withdrawFund(id, req.validatedBody as WithdrawFundInput, { id: req.user!.id });
    res.json(success(fund));
  } catch (err) {
    next(err);
  }
}

export async function listFundsController(req: Request, res: Response, next: NextFunction) {
  try {
    const { data, meta } = await listFunds(req.validatedQuery as ListFundsInput);
    res.json(successList(data, meta));
  } catch (err) {
    next(err);
  }
}
