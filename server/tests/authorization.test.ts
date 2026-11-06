// F-02 building blocks used by F-03..F-05: requireRole (BR-03, 403) and loadTeamInScope (BR-01, BR-02, 404).
import type { NextFunction, Request, Response } from 'express';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { pgPool, prisma } from '../src/db.js';
import { AppError } from '../src/errors.js';
import { requireRole } from '../src/middleware/require-role.js';
import { loadTeamInScope } from '../src/services/team-service.js';
import { seedTeams, seedUsers } from '../prisma/seed.js';

afterAll(async () => {
  await prisma.$disconnect();
  await pgPool.end();
});

const [SUP1, SUP2, S1] = seedUsers;
const [ALPHA, BETA, GAMMA] = seedTeams;
const asUser = (u: (typeof seedUsers)[number]) => ({ id: u.id, email: u.email, name: u.name, role: u.role });

function runMiddleware(role: 'STUDENT' | 'SUPERVISOR', user: ReturnType<typeof asUser>) {
  const next = vi.fn() as unknown as NextFunction & ReturnType<typeof vi.fn>;
  requireRole(role)({ user } as Request, {} as Response, next);
  return next;
}

describe('requireRole (BR-03, NFR-03)', () => {
  it('lets the right role through', () => {
    const next = runMiddleware('SUPERVISOR', asUser(SUP1));
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a student on a supervisor-only operation with 403 FORBIDDEN', () => {
    const next = runMiddleware('SUPERVISOR', asUser(S1));
    const err = next.mock.calls[0][0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('rejects a supervisor on a student-only operation with 403 FORBIDDEN', () => {
    const next = runMiddleware('STUDENT', asUser(SUP1));
    expect((next.mock.calls[0][0] as AppError).status).toBe(403);
  });
});

describe('loadTeamInScope (BR-01, BR-02, D-05)', () => {
  it('returns the team to a member student and to its supervisor', async () => {
    expect((await loadTeamInScope(asUser(S1), ALPHA.id)).id).toBe(ALPHA.id);
    expect((await loadTeamInScope(asUser(SUP1), BETA.id)).id).toBe(BETA.id);
  });

  it.each([
    ['student, other team', S1, BETA.id],
    ['supervisor, unassigned team', SUP2, ALPHA.id],
    ['unknown id', SUP1, '00000000-0000-4000-8000-0000000000ff'],
    ['malformed id', SUP1, 'abc'],
  ])('%s -> 404 NOT_FOUND', async (_label, user, teamId) => {
    await expect(loadTeamInScope(asUser(user), teamId)).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('Sup1 cannot reach Gamma either', async () => {
    await expect(loadTeamInScope(asUser(SUP1), GAMMA.id)).rejects.toMatchObject({ status: 404 });
  });
});
