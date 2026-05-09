import type { NextFunction, Request, Response } from 'express';
import { success, successList } from '../../lib/response.js';
import type {
  CreateDepositorInput,
  UpdateDepositorInput,
  ListDepositorsInput,
  DepositorParamsInput,
} from './depositors.schema.js';
import {
  createDepositor,
  getDepositor,
  listDepositors,
  updateDepositor,
  softDeleteDepositor,
} from './depositors.service.js';

export async function createDepositorController(req: Request, res: Response, next: NextFunction) {
  try {
    const depositor = await createDepositor(
      req.validatedBody as CreateDepositorInput,
      { id: req.user!.id },
    );
    res.status(201).json(success(depositor));
  } catch (err) {
    next(err);
  }
}

export async function getDepositorController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.validatedParams as DepositorParamsInput;
    const depositor = await getDepositor(id);
    res.json(success(depositor));
  } catch (err) {
    next(err);
  }
}

export async function listDepositorsController(req: Request, res: Response, next: NextFunction) {
  try {
    const { data, meta } = await listDepositors(req.validatedQuery as ListDepositorsInput);
    res.json(successList(data, meta));
  } catch (err) {
    next(err);
  }
}

export async function updateDepositorController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.validatedParams as DepositorParamsInput;
    const depositor = await updateDepositor(
      id,
      req.validatedBody as UpdateDepositorInput,
      { id: req.user!.id },
    );
    res.json(success(depositor));
  } catch (err) {
    next(err);
  }
}

export async function deleteDepositorController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.validatedParams as DepositorParamsInput;
    await softDeleteDepositor(id, { id: req.user!.id });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
