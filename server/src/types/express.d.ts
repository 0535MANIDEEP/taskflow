import type { Role } from '../types.js';

declare global {
  namespace Express {
    interface Request {
      /**
       * Set by the authenticate middleware. The user id comes from the token,
       * never from the request body, so a client cannot say who it is.
       */
      userId?: number;
      /** The role of the authenticated user. */
      userRole?: Role;
    }
  }
}

export {};
