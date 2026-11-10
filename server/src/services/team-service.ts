import { Prisma, Role } from '@prisma/client';
import { prisma } from '../db.js';
import { AppError } from '../errors.js';
import type { PublicUser } from './auth-service.js';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Only these fields leave the API: no password hashes, no membership internals.
const teamSelect = {
  id: true,
  name: true,
  supervisor: { select: { id: true, name: true } },
  members: {
    select: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: 'asc' } },
  },
} satisfies Prisma.TeamSelect;

type TeamRow = Prisma.TeamGetPayload<{ select: typeof teamSelect }>;

export type TeamView = {
  id: string;
  name: string;
  supervisor: { id: string; name: string };
  members: { id: string; name: string; email: string }[];
};

function toView(team: TeamRow): TeamView {
  return { id: team.id, name: team.name, supervisor: team.supervisor, members: team.members.map((m) => m.user) };
}

// The scope rule (SDS section 5): a student sees the team they are a member of, a supervisor sees the teams
// assigned to them. Expressed as a Prisma filter so it is applied inside the database query.
function scopeWhere(user: PublicUser): Prisma.TeamWhereInput {
  return user.role === Role.SUPERVISOR ? { supervisorId: user.id } : { members: { some: { userId: user.id } } };
}

const notFound = () => new AppError(404, 'NOT_FOUND', 'Not found or you do not have access');

// FR-04: teams visible to the user, ordered by name.
export async function listVisibleTeams(user: PublicUser): Promise<TeamView[]> {
  const teams = await prisma.team.findMany({ where: scopeWhere(user), select: teamSelect, orderBy: { name: 'asc' } });
  return teams.map(toView);
}

// BR-01, BR-02, D-05: returns the team only when it is in the user's scope. A missing team, another team and a
// malformed id all give the same 404, so the response never reveals that another team exists. F-03..F-05 call
// this after resolving the team of a milestone, submission or feedback.
export async function loadTeamInScope(user: PublicUser, teamId: string): Promise<TeamView> {
  if (!UUID.test(teamId)) throw notFound();
  const team = await prisma.team.findFirst({ where: { id: teamId, ...scopeWhere(user) }, select: teamSelect });
  if (!team) throw notFound();
  return toView(team);
}
