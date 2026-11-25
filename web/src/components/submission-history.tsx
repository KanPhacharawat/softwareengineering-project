import { CircleAlert, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBangkokDateTime, type SubmissionHistory } from '@/lib/api';
import { useApi } from '@/lib/use-api';

// F-06c History (FR-13, AC-34): every version oldest first with its feedback and revision request. Read-only.
export function SubmissionHistoryList({ submissionId }: { submissionId: string }) {
  const state = useApi<SubmissionHistory>(`/submissions/${encodeURIComponent(submissionId)}/history`);

  if (state.status === 'loading') {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading history">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertDescription className="flex items-center justify-between gap-3">
          Could not load history
          <Button variant="outline" size="sm" onClick={state.reload}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const { versions } = state.data;
  return (
    <div className="space-y-3">
      {versions.map((v) => (
        <Card key={v.versionNumber} aria-label={`Version ${v.versionNumber}`}>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              <h3>Version {v.versionNumber}</h3>
            </CardTitle>
            <CardDescription>
              Submitted by {v.submittedBy.name} at {formatBangkokDateTime(v.submittedAt)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="font-medium">{v.title}</p>
            <a
              href={v.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-primary underline underline-offset-4 break-all"
            >
              {v.link}
              <ExternalLink className="size-3.5 shrink-0" />
            </a>
            {v.description && <p className="leading-6 whitespace-pre-wrap">{v.description}</p>}
            {v.feedback ? (
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">
                  Feedback from {v.feedback.author.name} · {formatBangkokDateTime(v.feedback.createdAt)}
                </p>
                <p className="mt-1 leading-6 whitespace-pre-wrap">{v.feedback.comment}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">No feedback yet</p>
            )}
            {v.revisionRequest && (
              <div className="rounded-md border p-3">
                <p>
                  Revision requested by {v.revisionRequest.requestedBy.name}: {v.revisionRequest.reason}. Due{' '}
                  {formatBangkokDateTime(v.revisionRequest.dueAt)}
                </p>
                {v.revisionRequest.status === 'EXPIRED' && <p className="text-muted-foreground">Not resubmitted</p>}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      {versions.length === 1 && <p className="text-sm text-muted-foreground">No earlier versions</p>}
    </div>
  );
}
