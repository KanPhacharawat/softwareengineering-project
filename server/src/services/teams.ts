import type { PrismaClient } from '@prisma/client';
import type { CurrentUser } from '../middleware/auth.js';
import { notFound } from '../lib/errors.js';
import { isUuid } from '../lib/validate.js';

const teamView = {
  id: true,
  name: true,
  supervisor: { select: { id: true, name: true } },
  members: { select: { user: { select: { id: true, name: true, email: true } } } },
} as const;

type TeamRow = { id: string; name: string; supervisor: { id: string; name: string }; members: { user: { id: string; name: string; email: string } }[] };
const toDto = (t: TeamRow) => ({ ...t, members: t.members.map((m) => m.user).sort((a, b) => a.email.localeCompare(b.email)) });

/** Prisma filter for the teams a user may see (BR-01, BR-02). */
export function teamScope(user: CurrentUser) {
  return user.role === 'SUPERVISOR' ? { supervisorId: user.id } : { members: { some: { userId: user.id } } };
}

export async function listTeams(prisma: PrismaClient, user: CurrentUser) {
  const teams = await prisma.team.findMany({ where: teamScope(user), select: teamView, orderBy: { name: 'asc' } });
  return teams.map(toDto);
}

/** Returns the team only if it is in the user's scope; otherwise 404 (decision D-05). */
export async function getTeamInScope(prisma: PrismaClient, user: CurrentUser, teamId: string) {
  if (!isUuid(teamId)) throw notFound();
  const team = await prisma.team.findFirst({ where: { id: teamId, ...teamScope(user) }, select: teamView });
  if (!team) throw notFound();
  return toDto(team);
}
