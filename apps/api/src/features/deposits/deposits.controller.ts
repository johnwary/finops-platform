import type { NextFunction, Request, Response } from 'express';
import { success, successList } from '../../lib/response';
import type {
  CreateDepositInput,
  UpdateDepositInput,
  WithdrawDepositInput,
  CloseDepositInput,
  RecordPayoutInput,
  ListDepositsInput,
} from './deposits.schema';
import {
  createDeposit,
  getDeposit,
  listDeposits,
  updateDeposit,
  withdrawDeposit,
  closeDeposit,
  recordPayout,
  softDeleteDeposit,
} from './deposits.service';

export async function createDepositController(req: Request, res: Response, next: NextFunction) {
  try {
    const deposit = await createDeposit(
      req.validatedBody as CreateDepositInput,
      { id: req.user!.id },
    );
    res.status(201).json(success(deposit));
  } catch (err) {
    next(err);
  }
}

export async function getDepositController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.validatedParams as { id: string };
    const deposit = await getDeposit(id);
    res.json(success(deposit));
  } catch (err) {
    next(err);
  }
}

export async function listDepositsController(req: Request, res: Response, next: NextFunction) {
  try {
    const { data, meta } = await listDeposits(req.validatedQuery as ListDepositsInput);
    res.json(successList(data, meta));
  } catch (err) {
    next(err);
  }
}

export async function updateDepositController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.validatedParams as { id: string };
    const deposit = await updateDeposit(
      id,
      req.validatedBody as UpdateDepositInput,
      { id: req.user!.id },
    );
    res.json(success(deposit));
  } catch (err) {
    next(err);
  }
}

export async function withdrawDepositController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.validatedParams as { id: string };
    const deposit = await withdrawDeposit(
      id,
      req.validatedBody as WithdrawDepositInput,
      { id: req.user!.id },
    );
    res.json(success(deposit));
  } catch (err) {
    next(err);
  }
}

export async function closeDepositController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.validatedParams as { id: string };
    const deposit = await closeDeposit(
      id,
      req.validatedBody as CloseDepositInput,
      { id: req.user!.id },
    );
    res.json(success(deposit));
  } catch (err) {
    next(err);
  }
}

export async function recordPayoutController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.validatedParams as { id: string };
    const payout = await recordPayout(
      id,
      req.validatedBody as RecordPayoutInput,
      { id: req.user!.id },
    );
    res.status(201).json(success(payout));
  } catch (err) {
    next(err);
  }
}

export async function deleteDepositController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.validatedParams as { id: string };
    await softDeleteDeposit(id, { id: req.user!.id });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
