import type { Request, Response } from 'express';
import { success } from '../../lib/response.js';
import type { ListActivityLogsInput } from './activity.schema.js';
import { listActivityLogs } from './activity.service.js';

export async function listActivityLogsController(
  req: Request,
  res: Response,
) {
  const query = req.validatedQuery as ListActivityLogsInput;
  res.json(success(await listActivityLogs(query)));
}
