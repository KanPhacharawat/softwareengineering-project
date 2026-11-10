import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, CalendarClock, CircleAlert, Flag, Loader2, Plus, Users } from 'lucide-react';
import { useAuth } from '@/auth/auth-context';
import { MilestoneStatusBadge } from '@/components/milestone-status-badge';
import { EmptyState, ErrorState } from '@/components/page-states';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError, formatBangkokDateTime, type Milestone, type Team } from '@/lib/api';
import { useApi } from '@/lib/use-api';

// `/teams/:teamId` (F-02, F-03): team header, members and milestones.
// A supervisor sees the "New milestone" form under the table (FR-05).
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
  const { user } = useAuth();
  const milestonesState = useApi<{ milestones: Milestone[] }>(`/teams/${encodeURIComponent(team.id)}/milestones`);

  return (
    <div className="space-y-8">
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

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Milestones</h2>
        {milestonesState.status === 'loading' && <MilestonesSkeleton />}
        {milestonesState.status === 'error' && <ErrorState error={milestonesState.error} />}
        {milestonesState.status === 'success' &&
          (milestonesState.data.milestones.length === 0 ? (
            <EmptyState icon={Flag} message="No milestones yet" />
          ) : (
            <Card className="gap-0 py-0" data-testid="milestones-table">
              <CardContent className="px-0">
                {/* Desktop table (md and wider) */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-6 text-xs text-muted-foreground">Title</TableHead>
                        <TableHead className="px-6 text-xs text-muted-foreground">Due date</TableHead>
                        <TableHead className="px-6 text-xs text-muted-foreground">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {milestonesState.data.milestones.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="px-6">
                            <Link
                              to={`/milestones/${m.id}`}
                              className="font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                            >
                              {m.title}
                            </Link>
                            {m.description && (
                              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{m.description}</p>
                            )}
                          </TableCell>
                          <TableCell className="px-6 text-sm text-muted-foreground whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarClock className="size-3.5 text-muted-foreground" />
                              {formatBangkokDateTime(m.dueAt)}
                            </span>
                          </TableCell>
                          <TableCell className="px-6">
                            <MilestoneStatusBadge status={m.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile stacked list (below md): status moved down to fit screen */}
                <div className="divide-y divide-border md:hidden">
                  {milestonesState.data.milestones.map((m) => (
                    <div key={m.id} className="p-4 space-y-2">
                      <div>
                        <Link
                          to={`/milestones/${m.id}`}
                          className="font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm text-sm"
                        >
                          {m.title}
                        </Link>
                        {m.description && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{m.description}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarClock className="size-3.5 text-muted-foreground" />
                          Due {formatBangkokDateTime(m.dueAt)}
                        </span>
                        <MilestoneStatusBadge status={m.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

        {user?.role === 'SUPERVISOR' && (
          <NewMilestoneForm teamId={team.id} onCreated={() => milestonesState.reload()} />
        )}
      </section>
    </div>
  );
}

function NewMilestoneForm({ teamId, onCreated }: { teamId: string; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const trimmedTitle = title.trim();
    if (!trimmedTitle || trimmedTitle.length < 3 || trimmedTitle.length > 120) {
      newErrors.title = 'Title must be between 3 and 120 characters';
    }

    // Input type="datetime-local" gives local "YYYY-MM-DDTHH:mm".
    // Explicitly append Bangkok offset (+07:00) so dates are entered in Asia/Bangkok time (design.md section 6).
    const bangkokIso = dueAt ? (dueAt.length === 16 ? `${dueAt}:00+07:00` : `${dueAt}+07:00`) : '';

    if (!dueAt) {
      newErrors.dueAt = 'Due date is required';
    } else {
      const parsedTime = new Date(bangkokIso).getTime();
      if (isNaN(parsedTime)) {
        newErrors.dueAt = 'Invalid due date';
      } else if (parsedTime <= Date.now()) {
        newErrors.dueAt = 'Due date must be in the future';
      }
    }

    if (description.trim().length > 2000) {
      newErrors.description = 'Description cannot exceed 2000 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await api(`/teams/${encodeURIComponent(teamId)}/milestones`, {
        method: 'POST',
        body: {
          title: trimmedTitle,
          description: description.trim() || undefined,
          dueAt: bangkokIso,
        },
      });
      setTitle('');
      setDescription('');
      setDueAt('');
      onCreated();
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        setErrors(err.fields);
      } else {
        setErrors({ form: err instanceof Error ? err.message : 'Could not create milestone' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>
          <h3 className="text-base font-medium">New milestone</h3>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.form && (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="milestone-title">Title</Label>
            <Input
              id="milestone-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Milestone 1: Requirements"
              aria-invalid={!!errors.title}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="milestone-desc">Description</Label>
            <Textarea
              id="milestone-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional instructions or notes (max 2000 characters)"
              aria-invalid={!!errors.description}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="milestone-due" className="flex items-center gap-1.5">
              <CalendarClock className="size-4 text-muted-foreground" />
              Due date <span className="font-normal text-muted-foreground">(Bangkok time)</span>
            </Label>
            <Input
              id="milestone-due"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              aria-invalid={!!errors.dueAt}
            />
            <p className="text-xs text-muted-foreground">Asia/Bangkok (UTC+7)</p>
            {errors.dueAt && <p className="text-sm text-destructive">{errors.dueAt}</p>}
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Plus />}
            Create milestone
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MilestonesSkeleton() {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
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
