import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { AppError } from '../errors.js';

// BR-03, NFR-03: an operation that the user's role can never perform is rejected with 403 before any data
// lookup. Runs after requireAuth, so req.user is the session user (never a client-supplied role).
export function requireRole(role: Role): RequestHandler {
  return (req, _res, next) => {
    if (req.user?.role !== role) {
      return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to do this'));
    }
    next();
  };
}
