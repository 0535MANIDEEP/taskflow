import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { config } from '../config.js';
import { findById } from '../repositories/userRepository.js';

export interface TokenPayload {
  sub: string;
}

/**
 * Signs a session token.
 *
 * The token carries the user id and nothing else. The role is deliberately
 * not in it: see the authenticate middleware for why.
 */
export function signToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, config.jwtSecret, {
    expiresIn: config.tokenExpiresIn,
  });
}

/**
 * Requires a valid token on protected routes.
 *
 * Every protected route starts with authenticate. It reads the Authorization
 * header, checks the token, and attaches the user to the request. Handlers
 * never read the token themselves.
 *
 * The role is read from the database rather than from the token. A token is a
 * photograph of one moment and the database is the person: a token signed
 * before a role changed would keep the old role alive until it expired.
 * Reading it back costs one indexed lookup and means a change takes effect on
 * the next request.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';

  // The client sends "Bearer <token>". Anything else is not a request this
  // server knows how to answer.
  if (!header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  const token = header.slice('Bearer '.length);

  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, config.jwtSecret) as TokenPayload;
  } catch {
    // Both an expired token and a tampered one land here, and both get the
    // same message. Telling them apart would tell an attacker whether a token
    // is real.
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  findById(Number(payload.sub))
    .then((user) => {
      if (!user) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }
      req.userId = user.id;
      req.userRole = user.role;
      next();
    })
    .catch(next);
}
