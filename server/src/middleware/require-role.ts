import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';

// TDD red stub: replaced by the real check in the F-02 implementation commit.
export function requireRole(_role: Role): RequestHandler {
  return (_req, _res, next) => next();
}
