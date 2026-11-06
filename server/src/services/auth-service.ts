import bcrypt from 'bcryptjs';
import type { Role } from '@prisma/client';
import { prisma } from '../db.js';
import { AppError } from '../errors.js';

export type PublicUser = { id: string; email: string; name: string; role: Role };

// passwordHash is never selected into anything that leaves the service (NFR-01).
const publicUserSelect = { id: true, email: true, name: true, role: true } as const;

// Compared against when the email is unknown, so both failure paths take about the same time.
// bcrypt hash of a throwaway string; no account uses it.
const DUMMY_HASH = '$2b$12$XDsxi07rd2t7ckDGJwuPkOBNT2du599FK4bEaoQ0nrgjNZtuyMs3a';

export async function verifyCredentials(email: string, password: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) {
    // Same response for unknown email and wrong password (AC-02).
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export function findPublicUser(id: string): Promise<PublicUser | null> {
  return prisma.user.findUnique({ where: { id }, select: publicUserSelect });
}
