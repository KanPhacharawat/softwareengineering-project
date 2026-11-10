// TEST-00b (AC-00b): seed loaded into cpms_test
import { Role } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';

describe('seed data', () => {
  it('has 8 users: 2 supervisors and 6 students', async () => {
    expect(await prisma.user.count()).toBe(8);
    expect(await prisma.user.count({ where: { role: Role.SUPERVISOR } })).toBe(2);
    expect(await prisma.user.count({ where: { role: Role.STUDENT } })).toBe(6);
  });

  it('has 3 teams, each with a supervisor', async () => {
    const teams = await prisma.team.findMany({ include: { supervisor: true } });
    expect(teams.map((t) => t.name).sort()).toEqual(['Alpha', 'Beta', 'Gamma']);
    for (const team of teams) expect(team.supervisor.role).toBe(Role.SUPERVISOR);
  });

  it('puts every student in exactly one team', async () => {
    const students = await prisma.user.findMany({
      where: { role: Role.STUDENT },
      include: { memberships: true },
    });
    for (const s of students) expect(s.memberships).toHaveLength(1);
  });
});
