import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { validationError } from '../lib/response';

type ValidationSource = 'body' | 'query' | 'params';

function formatIssues(issues: Array<{ path: PropertyKey[]; message: string }>) {
  return issues.reduce<Record<string, string[]>>((acc, issue) => {
    const key = issue.path.join('.') || 'root';
    acc[key] = [...(acc[key] ?? []), issue.message];
    return acc;
  }, {});
}

export function validate(schema: ZodSchema, source: ValidationSource = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      res.status(422).json(validationError(formatIssues(result.error.issues)));
      return;
    }

    if (source === 'body') req.validatedBody = result.data;
    if (source === 'query') req.validatedQuery = result.data;
    if (source === 'params') req.validatedParams = result.data;

    next();
  };
}
