import { Link } from 'react-router';
import { ChevronRight, Users } from 'lucide-react';
import { useAuth } from '@/auth/auth-context';
import { EmptyState, ErrorState } from '@/components/page-states';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Team } from '@/lib/api';
import { useApi } from '@/lib/use-api';

// `/` (F-02, FR-04): the teams the user may see. A student sees their one team, a supervisor the assigned teams.
export function HomePage() {
  const { user } = useAuth();
  const state = useApi<{ teams: Team[] }>('/teams');
  const title = user?.role === 'STUDENT' ? 'My team' : 'My teams';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </div>

      {state.status === 'loading' && <TeamCardsSkeleton />}
      {state.status === 'error' && <ErrorState error={state.error} />}
      {state.status === 'success' &&
        (state.data.teams.length === 0 ? (
          <EmptyState
            icon={Users}
            message={user?.role === 'STUDENT' ? 'You are not in a team yet' : 'No teams assigned to you yet'}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {state.data.teams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        ))}
    </div>
  );
}

function TeamCard({ team }: { team: Team }) {
  return (
    <Link
      to={`/teams/${team.id}`}
      data-testid="team-card"
      className="group rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <Card className="h-full gap-4 transition-colors group-hover:bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Users className="size-4 text-muted-foreground" />
            {team.name}
            <ChevronRight className="ml-auto size-4 text-muted-foreground" />
          </CardTitle>
          <CardDescription>Supervisor: {team.supervisor.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {team.members.length} {team.members.length === 1 ? 'member' : 'members'}
          </p>
          <ul className="space-y-1 text-sm leading-6">
            {team.members.map((m) => (
              <li key={m.id}>{m.name}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </Link>
  );
}

function TeamCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Loading teams">
      {[0, 1].map((i) => (
        <div key={i} className="space-y-4 rounded-xl border p-6 shadow-sm">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-36" />
        </div>
      ))}
    </div>
  );
}
