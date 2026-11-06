import { Router } from 'express';
import { z } from 'zod';
import { AppError, validationError } from '../errors.js';
import { requireAuth } from '../middleware/require-auth.js';
import { SESSION_COOKIE } from '../session.js';
import { verifyCredentials } from '../services/auth-service.js';
import { config } from '../config.js';

const loginSchema = z.object({
  email: z.string({ error: 'Enter your email' }).trim().min(1, 'Enter your email').max(254, 'Email is too long'),
  password: z.string({ error: 'Enter your password' }).min(1, 'Enter your password').max(200, 'Password is too long'),
});

export const authRouter = Router();

// POST /api/auth/login (FR-01, AC-01, AC-02): public.
authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body ?? {});
  if (!parsed.success) throw validationError(parsed.error);

  const user = await verifyCredentials(parsed.data.email, parsed.data.password);

  // New session id on login prevents session fixation.
  await new Promise<void>((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));
  req.session.userId = user.id;
  await new Promise<void>((resolve, reject) => req.session.save((err) => (err ? reject(err) : resolve())));

  res.json({ user });
});

// POST /api/auth/logout (FR-02, AC-04): destroys the server session; 204 even without one (idempotent).
authRouter.post('/logout', async (req, res) => {
  await new Promise<void>((resolve, reject) =>
    req.session.destroy((err) => (err ? reject(new AppError(500, 'INTERNAL_ERROR', 'Could not log out')) : resolve())),
  );
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: config.nodeEnv === 'production' });
  res.status(204).end();
});

// GET /api/auth/me (FR-03): current user from the session.
authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
