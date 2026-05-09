import type { NextFunction, Request, Response } from 'express';
import { error } from '../lib/response.js';

export type Role = 'admin' | 'manager' | 'user';

export function requireRole(role: Role | Role[]) {
  const allowedRoles = Array.isArray(role) ? role : [role];

  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!userRole || !allowedRoles.includes(userRole as Role)) {
      res.status(403).json(error('FORBIDDEN', 'Insufficient permissions.', 403));
      return;
    }

    next();
  };
}
