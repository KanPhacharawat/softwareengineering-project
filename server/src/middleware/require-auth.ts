import type { RequestHandler } from 'express';
import { AppError } from '../errors.js';
import { findPublicUser, type PublicUser } from '../services/auth-service.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

// Loads the session user on every protected request (SDS section 6). No session, an expired or destroyed
// session, or a deleted user all give 401 with no data (NFR-02).
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const userId = req.session.userId;
  const user = userId ? await findPublicUser(userId) : null;
  if (!user) return next(new AppError(401, 'UNAUTHENTICATED', 'Please log in to continue'));
  req.user = user;
  next();
};
