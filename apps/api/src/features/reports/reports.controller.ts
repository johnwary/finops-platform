import type { NextFunction, Request, Response } from 'express';
import { success } from '../../lib/response.js';
import type { PeriodInput } from './reports.schema.js';
import { getSummary, getOverdue, getPortfolioAtRisk } from './reports.service.js';

export async function summaryController(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getSummary(req.validatedQuery as PeriodInput);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function overdueController(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getOverdue();
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function portfolioAtRiskController(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getPortfolioAtRisk();
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}
