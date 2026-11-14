import type { NextFunction, Request, Response } from 'express';

import { HttpError } from '../lib/httpError.js';

/**
 * The last error handler.
 *
 * An HttpError thrown by a service carries the status and the message that
 * should reach the client. Anything else is a bug in this server, and the
 * client is told that without being told anything about it.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
}
