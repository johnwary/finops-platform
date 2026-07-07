import type { NextFunction, Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth.js';
import { error } from '../lib/response.js';

function hasActiveBan(user: { banned?: boolean | null; banExpires?: Date | string | null }) {
  if (!user.banned) return false;
  return !user.banExpires || new Date(user.banExpires).getTime() >= Date.now();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      res.status(401).json(error('UNAUTHORIZED', 'Authentication required.', 401));
      return;
    }

    if (hasActiveBan(session.user)) {
      res.status(403).json(error('BANNED_USER', 'Your account is banned.', 403));
      return;
    }

    req.user = session.user;
    req.session = session.session;
    next();
  } catch (err) {
    next(err);
  }
}
