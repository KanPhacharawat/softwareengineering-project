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

describe('seed rerun (production-safe)', () => {
  it('keeps app data and does not duplicate demo rows when run again without reset', async () => {
    const { seed } = await import('../prisma/seed.js');
    const { seedTeams } = await import('../prisma/seed.js');
    const team = seedTeams[0];
    const milestone = await prisma.milestone.create({
      data: { teamId: team.id, title: 'Seed rerun check', dueAt: new Date('2030-01-01'), createdById: team.supervisorId },
    });
    try {
      await seed(prisma);
      await seed(prisma);
      expect(await prisma.user.count()).toBe(8);
      expect(await prisma.team.count()).toBe(3);
      expect(await prisma.teamMember.count()).toBe(6);
      expect(await prisma.milestone.findUnique({ where: { id: milestone.id } })).not.toBeNull();
    } finally {
      await prisma.milestone.delete({ where: { id: milestone.id } });
    }
  });
});
