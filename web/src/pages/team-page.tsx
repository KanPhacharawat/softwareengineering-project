import { Link, useParams } from 'react-router';
import { ArrowLeft, Users } from 'lucide-react';
import { useAuth } from '@/auth/auth-context';
import { EmptyState, ErrorState } from '@/components/page-states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Team } from '@/lib/api';
import { useApi } from '@/lib/use-api';

// `/teams/:teamId` (F-02): team header and members. Milestones are added to this page in F-03.
// Another team's id gives the API's 404, shown as "Not found or you do not have access" (AC-10).
export function TeamPage() {
  const { teamId = '' } = useParams();
  const { user } = useAuth();
  const state = useApi<{ team: Team }>(`/teams/${encodeURIComponent(teamId)}`);
  const homeLabel = user?.role === 'STUDENT' ? 'My team' : 'My teams';

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link to="/" className="transition-colors hover:text-foreground">
              {homeLabel}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground" aria-current="page">
            {state.status === 'success' ? state.data.team.name : state.status === 'loading' ? '…' : 'Team'}
          </li>
        </ol>
      </nav>

      {state.status === 'loading' && <TeamPageSkeleton />}
      {state.status === 'error' && (
        <div className="space-y-4">
          <ErrorState error={state.error} />
          <Button variant="outline" asChild>
            <Link to="/">
              <ArrowLeft />
              Back to {homeLabel.toLowerCase()}
            </Link>
          </Button>
        </div>
      )}
      {state.status === 'success' && <TeamDetail team={state.data.team} />}
    </div>
  );
}

function TeamDetail({ team }: { team: Team }) {
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{team.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Supervisor: {team.supervisor.name}</p>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Members</h2>
        {team.members.length === 0 ? (
          <EmptyState icon={Users} message="No members yet" />
        ) : (
          <Card className="gap-0 py-0">
            <CardContent className="px-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-6 text-xs text-muted-foreground">Name</TableHead>
                    <TableHead className="px-6 text-xs text-muted-foreground">Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="px-6 font-medium">{m.name}</TableCell>
                      <TableCell className="px-6 text-muted-foreground">{m.email}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>
    </>
  );
}

function TeamPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading team">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="h-6 w-24" />
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-4 w-full" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
