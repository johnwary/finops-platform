import type { NextFunction, Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth';
import { error } from '../lib/response';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      res.status(401).json(error('UNAUTHORIZED', 'Authentication required.', 401));
      return;
    }

    req.user = session.user;
    req.session = session.session;
    next();
  } catch (err) {
    next(err);
  }
}
