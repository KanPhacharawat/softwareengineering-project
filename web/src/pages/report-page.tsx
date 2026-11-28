import { Link } from 'react-router';
import { ArrowLeft, LayoutGrid, Users } from 'lucide-react';
import { EmptyState, ErrorState } from '@/components/page-states';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SupervisorSummaryReport, TeamReportRow } from '@/lib/api';
import { useApi } from '@/lib/use-api';

// `/reports` (F-10, FR-18, AC-62): read-only summary report across teams assigned to the supervisor.
export function ReportPage() {
  const state = useApi<SupervisorSummaryReport>('/reports/supervisor-summary');

  const subtitle =
    state.status === 'success'
      ? `${state.data.overall.teamCount} assigned ${state.data.overall.teamCount === 1 ? 'team' : 'teams'}`
      : state.status === 'loading'
        ? '…'
        : null;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/">
          <ArrowLeft />
          Back to my teams
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Supervisor summary report</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      {state.status === 'loading' && <ReportSkeleton />}
      {state.status === 'error' && (
        <div className="space-y-4">
          <ErrorState error={state.error} />
          <Button variant="outline" asChild>
            <Link to="/">
              <ArrowLeft />
              Back to home
            </Link>
          </Button>
        </div>
      )}
      {state.status === 'success' && <ReportContent report={state.data} />}
    </div>
  );
}

function ReportContent({ report }: { report: SupervisorSummaryReport }) {
  const { overall, teams } = report;
  if (teams.length === 0) return <EmptyState icon={Users} message="No assigned teams yet." />;

  const tiles = [
    { label: 'Teams', value: String(overall.teamCount) },
    { label: 'Milestones', value: String(overall.milestonesTotal) },
    { label: 'Submitted', value: String(overall.submitted) },
    { label: 'Feedback pending', value: String(overall.feedbackPending) },
    { label: 'Late', value: String(overall.late) },
    { label: 'Missing', value: String(overall.missing) },
    { label: 'Graded', value: `${overall.graded} / ${overall.milestonesTotal}` },
    { label: 'Average score', value: overall.averageScore === null ? '–' : String(overall.averageScore) },
  ];

  return (
    <div className="space-y-6">
      <div data-testid="overall-summary" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="py-4">
            <CardContent className="px-4">
              <p className="text-sm text-muted-foreground">{t.label}</p>
              <p className="mt-1 text-2xl font-semibold">{t.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="gap-0 py-0">
        <CardContent className="px-0">
          {/* Desktop table (md and wider) */}
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-4 text-xs text-muted-foreground">Team</TableHead>
                  <TableHead className="px-3 text-right text-xs text-muted-foreground">Milestones</TableHead>
                  <TableHead className="px-3 text-right text-xs text-muted-foreground">Submitted</TableHead>
                  <TableHead className="px-3 text-right text-xs text-muted-foreground">Feedback pending</TableHead>
                  <TableHead className="px-3 text-right text-xs text-muted-foreground">Revision requested</TableHead>
                  <TableHead className="px-3 text-right text-xs text-muted-foreground">Late</TableHead>
                  <TableHead className="px-3 text-right text-xs text-muted-foreground">Missing</TableHead>
                  <TableHead className="px-3 text-right text-xs text-muted-foreground">Graded</TableHead>
                  <TableHead className="px-3 text-right text-xs text-muted-foreground">Average score</TableHead>
                  <TableHead className="px-4 text-right text-xs text-muted-foreground">Board</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((row) => (
                  <TableRow key={row.teamId}>
                    <TableCell className="px-4 font-medium">
                      <Link to={`/teams/${encodeURIComponent(row.teamId)}`} className="hover:underline">
                        {row.teamName}
                      </Link>
                    </TableCell>
                    <TableCell className="px-3 text-right">{row.milestonesTotal}</TableCell>
                    <TableCell className="px-3 text-right">{row.submitted}</TableCell>
                    <TableCell className="px-3 text-right">{row.feedbackPending}</TableCell>
                    <TableCell className="px-3 text-right">{row.revisionRequested}</TableCell>
                    <TableCell className="px-3 text-right">{row.late}</TableCell>
                    <TableCell className="px-3 text-right">{row.missing}</TableCell>
                    <TableCell className="px-3 text-right">
                      {row.graded} / {row.milestonesTotal}
                    </TableCell>
                    <TableCell className="px-3 text-right">
                      {row.averageScore === null ? '–' : row.averageScore}
                    </TableCell>
                    <TableCell className="px-4 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/teams/${encodeURIComponent(row.teamId)}/board`}>
                          <LayoutGrid />
                          Board
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile stacked cards (below md) */}
          <div className="divide-y divide-border md:hidden">
            {teams.map((row) => (
              <MobileTeamRow key={row.teamId} row={row} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MobileTeamRow({ row }: { row: TeamReportRow }) {
  return (
    <div className="space-y-2 p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <Link to={`/teams/${encodeURIComponent(row.teamId)}`} className="font-medium hover:underline">
          {row.teamName}
        </Link>
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/teams/${encodeURIComponent(row.teamId)}/board`}>
            <LayoutGrid />
            Board
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div>Milestones: {row.milestonesTotal}</div>
        <div>Submitted: {row.submitted}</div>
        <div>Feedback pending: {row.feedbackPending}</div>
        <div>Revision requested: {row.revisionRequested}</div>
        <div>Late: {row.late}</div>
        <div>Missing: {row.missing}</div>
        <div>
          Graded: {row.graded} / {row.milestonesTotal}
        </div>
        <div>Average score: {row.averageScore === null ? '–' : row.averageScore}</div>
      </div>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading report">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Card className="gap-0 py-0">
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </CardContent>
      </Card>
    </div>
  );
}
