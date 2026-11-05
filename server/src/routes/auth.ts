import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { AppError } from '../lib/errors.js';
import { parseBody } from '../lib/validate.js';
import { publicUser, requireAuth } from '../middleware/auth.js';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').max(254),
  password: z.string().min(1, 'Password is required').max(200),
});

// Compared against when the email is unknown, so both failures take similar time.
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10);

export function authRouter(prisma: PrismaClient) {
  const r = Router();

  r.post('/login', async (req, res) => {
    const { email, password } = parseBody(loginSchema, req.body);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

    // New session id on login prevents session fixation.
    await new Promise<void>((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())));
    req.session.userId = user.id;
    const { id, name, role } = user;
    res.json({ user: { id, email: user.email, name, role } });
  });

  r.post('/logout', (req, res, next) => {
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('cpms.sid');
      res.status(204).end();
    });
  });

  r.get('/me', requireAuth(prisma), async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, select: publicUser });
    res.json({ user });
  });

  return r;
}
