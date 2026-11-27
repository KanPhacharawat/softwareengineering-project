import { Link, useParams } from 'react-router';
import { ArrowLeft, Flag } from 'lucide-react';
import { statusStyle } from '@/components/milestone-status-badge';
import { ClosedBadge } from '@/components/closed-badge';
import { LateBadge } from '@/components/late-badge';
import { EmptyState, ErrorState } from '@/components/page-states';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBangkokDateTime, type BoardCard, type MilestoneStatus, type ProgressBoard } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { cn } from '@/lib/utils';

// F-09 column headings are fixed Title Case text; colours/icons come from the status badge (contract v0.2).
const HEADINGS: Record<MilestoneStatus, string> = {
  OPEN: 'Open',
  SUBMITTED: 'Submitted',
  REVISION_REQUESTED: 'Revision requested',
  FEEDBACK_GIVEN: 'Feedback given',
  MISSED: 'Missed',
};

// `/teams/:teamId/board` (F-09, FR-17, FR-19): read-only progress summary and milestones grouped by status.
export function BoardPage() {
  const { teamId = '' } = useParams();
  const state = useApi<ProgressBoard>(`/teams/${encodeURIComponent(teamId)}/board`);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to={`/teams/${encodeURIComponent(teamId)}`}>
          <ArrowLeft />
          Back to team
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Progress board</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {state.status === 'success' ? state.data.team.name : state.status === 'loading' ? '…' : 'Team'}
        </p>
      </div>

      {state.status === 'loading' && <BoardSkeleton />}
      {state.status === 'error' && <ErrorState error={state.error} />}
      {state.status === 'success' && <Board board={state.data} />}
    </div>
  );
}

function Board({ board }: { board: ProgressBoard }) {
  const { summary } = board;
  if (summary.total === 0) return <EmptyState icon={Flag} message="No milestones yet." />;

  const tiles = [
    { label: 'Milestones', value: String(summary.total) },
    { label: 'Graded', value: `${summary.graded} / ${summary.total}` },
    { label: 'Average score', value: summary.averageScore === null ? '–' : String(summary.averageScore) },
    { label: 'Closed', value: String(summary.closed) },
  ];

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="py-4">
            <CardContent className="px-4">
              <dt className="text-sm text-muted-foreground">{t.label}</dt>
              <dd className="mt-1 text-2xl font-semibold">{t.value}</dd>
            </CardContent>
          </Card>
        ))}
      </dl>

      <div className="grid gap-4 lg:grid-cols-5">
        {board.columns.map((col) => (
          <Column key={col.status} status={col.status} cards={col.cards} />
        ))}
      </div>
    </div>
  );
}

function Column({ status, cards }: { status: MilestoneStatus; cards: BoardCard[] }) {
  const style = statusStyle[status];
  const Icon = style.icon;
  const headingId = `col-${status}`;
  return (
    <section aria-labelledby={headingId} className="space-y-3 rounded-xl border bg-muted/30 p-3">
      <h2 id={headingId} className={cn('flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm font-medium', style.className)}>
        <Icon className="size-3.5" />
        {HEADINGS[status]} ({cards.length})
      </h2>
      {cards.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">None</p>
      ) : (
        <ul className="space-y-2">
          {cards.map((c) => (
            <li key={c.id}>
              <MilestoneCard card={c} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MilestoneCard({ card }: { card: BoardCard }) {
  return (
    <Card className="gap-2 py-3">
      <CardContent className="space-y-1.5 px-3 text-sm">
        <Link to={`/milestones/${card.id}`} className="font-medium hover:underline">
          {card.title}
        </Link>
        <p className="text-muted-foreground">Due {formatBangkokDateTime(card.dueAt)}</p>
        {card.versionNumber !== null && <p className="text-muted-foreground">Version {card.versionNumber}</p>}
        {card.score !== null && <p>Score {card.score} / 100</p>}
        {(card.closedAt || card.lateAt) && (
          <div className="flex flex-wrap gap-1.5">
            {card.closedAt && <ClosedBadge />}
            {card.lateAt && <LateBadge />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BoardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading board">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  );
}
