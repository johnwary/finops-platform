import type { Request, Response } from 'express';
import { success } from '../../lib/response.js';
import type { PeriodInput } from './reports.schema.js';
import { getSummary, getOverdue, getPortfolioAtRisk } from './reports.service.js';

export async function summaryController(req: Request, res: Response) {
  const data = await getSummary(req.validatedQuery as PeriodInput);
  res.json(success(data));
}

export async function overdueController(_req: Request, res: Response) {
  const data = await getOverdue();
  res.json(success(data));
}

export async function portfolioAtRiskController(_req: Request, res: Response) {
  const data = await getPortfolioAtRisk();
  res.json(success(data));
}
