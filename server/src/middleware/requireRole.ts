import type { NextFunction, Request, Response } from 'express';

import type { Role } from '../types.js';

/**
 * Restricts a route to certain roles.
 *
 * This is the coarse half of the access control. The fine half lives in the
 * services, where a rule like "an admin can delete any project, a member can
 * only delete one they created" actually lives. A role gate answers "is this
 * kind of person allowed to be here at all".
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      res.status(403).json({ error: 'Your role cannot do that' });
      return;
    }
    next();
  };
}
