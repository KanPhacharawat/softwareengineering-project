import type { RequestHandler } from 'express';
import type { PrismaClient, Role } from '@prisma/client';
import { forbidden, unauthenticated } from '../lib/errors.js';

export type CurrentUser = { id: string; email: string; name: string; role: Role };

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: CurrentUser;
    }
  }
}

export const publicUser = { id: true, email: true, name: true, role: true } as const;

/** Loads the current user from the server-side session; rejects with 401 when missing. */
export function requireAuth(prisma: PrismaClient): RequestHandler {
  return async (req, _res, next) => {
    const userId = req.session.userId;
    if (!userId) return next(unauthenticated());
    const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUser });
    if (!user) return next(unauthenticated());
    req.user = user;
    next();
  };
}

/** Rejects a wrong-role operation with 403 before any data is read (BR-03). */
export function requireRole(role: Role): RequestHandler {
  return (req, _res, next) => (req.user?.role === role ? next() : next(forbidden()));
}
