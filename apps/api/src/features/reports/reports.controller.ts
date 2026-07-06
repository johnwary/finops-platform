import type { Request, Response } from 'express';
import { success, successList } from '../../lib/response.js';
import type { OverdueInput, PeriodInput } from './reports.schema.js';
import { getSummary, getOverdue, getPortfolioAtRisk } from './reports.service.js';

export async function summaryController(req: Request, res: Response) {
  const data = await getSummary(req.validatedQuery as PeriodInput);
  res.json(success(data));
}

export async function overdueController(req: Request, res: Response) {
  const { data, meta } = await getOverdue(req.validatedQuery as OverdueInput);
  res.json(successList(data, meta));
}

export async function portfolioAtRiskController(_req: Request, res: Response) {
  const data = await getPortfolioAtRisk();
  res.json(success(data));
}
