import type { NextFunction, Request, Response } from 'express';
import { success } from '../../lib/response.js';
import type { ListActivityLogsInput } from './activity.schema.js';
import { listActivityLogs } from './activity.service.js';

export async function listActivityLogsController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const query = req.validatedQuery as ListActivityLogsInput;
    res.json(success(await listActivityLogs(query)));
  } catch (err) {
    next(err);
  }
}
