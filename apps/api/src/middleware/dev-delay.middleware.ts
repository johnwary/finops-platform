import type { NextFunction, Request, Response } from 'express';

export function devDelay(ms: number) {
  return (_req: Request, _res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV !== 'development' || process.env.DEV_DELAY !== 'true') return next();
    setTimeout(() => next(), ms);
  };
}
