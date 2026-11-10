import { Router } from 'express';
import { z } from 'zod';
import { validationError } from '../errors.js';
import { requireAuth } from '../middleware/require-auth.js';
import { cookieOptions, SESSION_COOKIE } from '../session.js';
import { verifyCredentials } from '../services/auth-service.js';

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
  req.session.userId = user.id; // saved by express-session when the response ends

  res.json({ user });
});

// POST /api/auth/logout (FR-02, AC-04): destroys the server session; 204 even without one (idempotent).
authRouter.post('/logout', async (req, res) => {
  await new Promise<void>((resolve, reject) => req.session.destroy((err) => (err ? reject(err) : resolve())));
  res.clearCookie(SESSION_COOKIE, cookieOptions);
  res.status(204).end();
});

// GET /api/auth/me (FR-03): current user from the session.
authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
