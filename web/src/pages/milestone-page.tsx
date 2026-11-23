import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, CalendarClock, CircleAlert, ExternalLink, FileText, Info, Loader2, Lock, MessageSquare, Pencil, RotateCcw, Send } from 'lucide-react';
import { useAuth } from '@/auth/auth-context';
import { MilestoneStatusBadge } from '@/components/milestone-status-badge';
import { SubmissionHistoryList } from '@/components/submission-history';
import { EmptyState, ErrorState } from '@/components/page-states';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError, formatBangkokDateTime, type MilestoneDetail, type RevisionRequest, type Submission } from '@/lib/api';
import { useApi } from '@/lib/use-api';

// `/milestones/:milestoneId` (F-04): milestone details, team submission and editing.
export function MilestonePage() {
  const { milestoneId = '' } = useParams();
  const { user } = useAuth();
  const state = useApi<MilestoneDetail>(`/milestones/${encodeURIComponent(milestoneId)}`);
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
          {state.status === 'success' ? (
            <>
              <li>
                <Link to={`/teams/${state.data.team.id}`} className="transition-colors hover:text-foreground">
                  {state.data.team.name}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-foreground" aria-current="page">
                {state.data.milestone.title}
              </li>
            </>
          ) : (
            <li className="text-foreground" aria-current="page">
              {state.status === 'loading' ? '…' : 'Milestone'}
            </li>
          )}
        </ol>
      </nav>

      {state.status === 'loading' && <MilestonePageSkeleton />}
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
      {state.status === 'success' && (
        <MilestoneDetailContent detail={state.data} onReload={() => state.reload()} />
      )}
    </div>
  );
}

function MilestoneDetailContent({
  detail,
  onReload,
}: {
  detail: MilestoneDetail;
  onReload: () => void;
}) {
  const { user } = useAuth();
  const { milestone, submission } = detail;
  const [isEditing, setIsEditing] = useState(false);

  const isStudent = user?.role === 'STUDENT';
  // F-06: the server gives the edit window of the current version (revision due for v >= 2), so the browser does not recompute it
  const deadlinePassed = Date.now() >= new Date(submission?.editableUntil ?? milestone.dueAt).getTime();
  const canEdit = isStudent && !deadlinePassed && !submission?.feedback;
  const canResubmit = isStudent && submission?.revisionRequest?.status === 'OPEN';

  return (
    <div className="space-y-8">
      {/* Milestone Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-2xl font-semibold tracking-tight">{milestone.title}</CardTitle>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarClock className="size-4" />
                Due {formatBangkokDateTime(milestone.dueAt)} (Bangkok time)
              </p>
            </div>
            <div>
              <MilestoneStatusBadge status={milestone.status} />
            </div>
          </div>
        </CardHeader>
        {milestone.description && (
          <CardContent>
            <p className="text-sm leading-6 whitespace-pre-wrap text-muted-foreground">
              {milestone.description}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Submission Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Submission</h2>

        {/* Status Notices (F-04 / F-05) */}
        {canResubmit ? null : isStudent && submission?.feedback ? (
          <Alert>
            <Lock className="size-4" />
            <AlertDescription>Locked after feedback</AlertDescription>
          </Alert>
        ) : deadlinePassed ? (
          <Alert>
            <Info className="size-4" />
            <AlertDescription>Submission closed: deadline passed</AlertDescription>
          </Alert>
        ) : null}

        {/* Existing Submission */}
        {submission && !isEditing && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-medium">
                    {submission.title}{' '}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">Version {submission.currentVersion}</span>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Submitted by {submission.createdBy.name} at {formatBangkokDateTime(submission.submittedAt)} · Last
                    updated by {submission.submittedBy.name} at {formatBangkokDateTime(submission.updatedAt)}
                  </CardDescription>
                </div>
                {canEdit && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Pencil className="size-4" />
                    Edit submission
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Deliverable link</Label>
                <div className="mt-1">
                  <a
                    href={submission.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-sm text-primary underline underline-offset-4 hover:opacity-80 break-all"
                  >
                    {submission.link}
                    <ExternalLink className="size-3.5 inline shrink-0" />
                  </a>
                </div>
              </div>
              {submission.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Description / Notes</Label>
                  <p className="mt-1 text-sm leading-6 whitespace-pre-wrap">{submission.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Feedback Section (F-05) */}
        {submission && submission.feedback && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="size-5 text-muted-foreground" />
                <CardTitle className="text-lg font-medium">Feedback</CardTitle>
              </div>
              <CardDescription className="mt-1">
                Recorded by {submission.feedback.author.name} on {formatBangkokDateTime(submission.feedback.createdAt)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 whitespace-pre-wrap">{submission.feedback.comment}</p>
            </CardContent>
          </Card>
        )}

        {/* Revision request (F-06): student alert, supervisor block or form */}
        {submission?.revisionRequest && (
          <RevisionRequestNotice request={submission.revisionRequest} isStudent={isStudent} />
        )}
        {submission && submission.feedback && !submission.revisionRequest && !isStudent && (
          <RevisionRequestForm submissionId={submission.id} onSaved={onReload} />
        )}
        {submission && canResubmit && (
          <SubmissionForm milestoneId={milestone.id} initialValues={submission} resubmitId={submission.id} onSaved={onReload} />
        )}

        {/* Supervisor Feedback Form (F-05) */}
        {submission && !submission.feedback && !isStudent && (
          <FeedbackForm
            submissionId={submission.id}
            onSaved={onReload}
          />
        )}

        {/* Edit Submission Form */}
        {submission && isEditing && (
          <SubmissionForm
            milestoneId={milestone.id}
            initialValues={submission}
            isEdit={true}
            onSaved={() => {
              setIsEditing(false);
              onReload();
            }}
            onCancel={() => setIsEditing(false)}
          />
        )}

        {/* No Submission yet */}
        {!submission && (
          <>
            {canEdit && (
              <SubmissionForm
                milestoneId={milestone.id}
                onSaved={onReload}
              />
            )}

            {!isStudent && (
              <EmptyState icon={FileText} message="No submission yet" />
            )}
          </>
        )}
      </section>

      {/* History (F-06c): the key changes on every write, so the list re-fetches after onReload */}
      {submission && (
        <section className="space-y-4" aria-labelledby="history-heading">
          <h2 id="history-heading" className="text-lg font-semibold">History</h2>
          <SubmissionHistoryList
            key={[submission.id, submission.currentVersion, submission.updatedAt, submission.feedback?.id, submission.revisionRequest?.id].join()}
            submissionId={submission.id}
          />
        </section>
      )}
    </div>
  );
}

function FeedbackForm({
  submissionId,
  onSaved,
}: {
  submissionId: string;
  onSaved: () => void;
}) {
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = comment.trim();
    const newErrors: Record<string, string> = {};

    if (!trimmed) {
      newErrors.comment = 'Comment is required';
    } else if (trimmed.length > 2000) {
      newErrors.comment = 'Comment cannot exceed 2000 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await api(`/submissions/${encodeURIComponent(submissionId)}/feedback`, {
        method: 'POST',
        body: { comment: trimmed },
      });
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields && Object.keys(err.fields).length > 0) {
          setErrors(err.fields);
        } else {
          setErrors({ form: err.message });
        }
      } else {
        setErrors({ form: err instanceof Error ? err.message : 'Could not save feedback' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3 className="text-base font-medium">Record feedback</h3>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {errors.form && (
            <Alert variant="destructive">
              <CircleAlert className="size-4" />
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="feedback-comment">Feedback</Label>
            <Textarea
              id="feedback-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write feedback for the team (max 2000 characters)"
              aria-invalid={!!errors.comment}
            />
            {errors.comment && <p className="text-sm text-destructive">{errors.comment}</p>}
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin size-4" />}
            Save feedback
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function RevisionRequestNotice({ request, isStudent }: { request: RevisionRequest; isStudent: boolean }) {
  const due = formatBangkokDateTime(request.dueAt);
  const expired = request.status === 'EXPIRED';
  if (isStudent) {
    return (
      <Alert>
        <RotateCcw className="size-4" />
        <AlertDescription>
          {expired ? 'Revision due date has passed.' : `Revision requested: ${request.reason}. Resubmit by ${due}.`}
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert>
      <RotateCcw className="size-4" />
      <AlertDescription>
        <p>
          Revision requested by {request.requestedBy.name}: {request.reason}. Due {due}
        </p>
        <p className="text-muted-foreground">
          {expired ? 'Not resubmitted: revision due date has passed' : 'Waiting for the team to resubmit'}
        </p>
      </AlertDescription>
    </Alert>
  );
}

function RevisionRequestForm({ submissionId, onSaved }: { submissionId: string; onSaved: () => void }) {
  const [reason, setReason] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);
    try {
      // datetime-local gives "YYYY-MM-DDTHH:mm" with no zone: entered in Asia/Bangkok, same as team-page.tsx
      const bangkokIso = dueAt ? (dueAt.length === 16 ? `${dueAt}:00+07:00` : `${dueAt}+07:00`) : undefined;
      await api(`/submissions/${encodeURIComponent(submissionId)}/revision-request`, {
        method: 'POST',
        body: { reason, dueAt: bangkokIso },
      });
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.fields && Object.keys(err.fields).length > 0) {
        setErrors(err.fields);
      } else {
        setErrors({ form: err instanceof Error ? err.message : 'Could not request revision' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3 className="text-base font-medium">Request revision</h3>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="revision-reason">Reason</Label>
            <Textarea
              id="revision-reason"
              value={reason}
              maxLength={1000}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What should the team change?"
              aria-invalid={!!errors.reason}
            />
            <p className="text-xs text-muted-foreground">{reason.length} / 1000</p>
            {errors.reason && <p className="text-sm text-destructive">{errors.reason}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="revision-due">Revision due</Label>
            <Input
              id="revision-due"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              aria-invalid={!!errors.dueAt}
            />
            <p className="text-xs text-muted-foreground">Asia/Bangkok (UTC+7)</p>
            {errors.dueAt && <p className="text-sm text-destructive">{errors.dueAt}</p>}
          </div>

          {errors.form && (
            <Alert variant="destructive">
              <CircleAlert className="size-4" />
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin size-4" />}
            {isSubmitting ? 'Requesting…' : 'Request revision'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SubmissionForm({
  milestoneId,
  initialValues,
  isEdit = false,
  resubmitId,
  onSaved,
  onCancel,
}: {
  milestoneId: string;
  initialValues?: Submission;
  isEdit?: boolean;
  /** F-06: post a new version of this submission instead of creating/editing (button "Resubmit") */
  resubmitId?: string;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [link, setLink] = useState(initialValues?.link ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const trimmedTitle = title.trim();
    if (!trimmedTitle || trimmedTitle.length < 3 || trimmedTitle.length > 120) {
      newErrors.title = 'Title must be between 3 and 120 characters';
    }

    if (description.trim().length > 2000) {
      newErrors.description = 'Description cannot exceed 2000 characters';
    }

    const trimmedLink = link.trim();
    if (!trimmedLink) {
      newErrors.link = 'Link is required';
    } else if (trimmedLink.length > 500) {
      newErrors.link = 'Link cannot exceed 500 characters';
    } else {
      try {
        const u = new URL(trimmedLink);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          newErrors.link = 'Link must be an http or https URL';
        }
      } catch {
        newErrors.link = 'Link must be a valid URL';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      const path = resubmitId
        ? `/submissions/${encodeURIComponent(resubmitId)}/versions`
        : `/milestones/${encodeURIComponent(milestoneId)}/submission`;
      await api(path, {
        method: isEdit ? 'PUT' : 'POST',
        body: {
          title: trimmedTitle,
          description: description.trim() || undefined,
          link: trimmedLink,
        },
      });
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields && Object.keys(err.fields).length > 0) {
          setErrors(err.fields);
        } else {
          setErrors({ form: err.message });
        }
      } else {
        setErrors({ form: err instanceof Error ? err.message : 'Could not save submission' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3 className="text-base font-medium">{resubmitId ? 'Resubmit' : isEdit ? 'Edit submission' : 'Submit work'}</h3>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {errors.form && (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="submission-title">Title</Label>
            <Input
              id="submission-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Final Report & Source Code"
              aria-invalid={!!errors.title}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="submission-link">Deliverable link</Label>
            <Input
              id="submission-link"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://github.com/..."
              aria-invalid={!!errors.link}
            />
            {errors.link && <p className="text-sm text-destructive">{errors.link}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="submission-desc">Description</Label>
            <Textarea
              id="submission-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes or instructions for your supervisor (max 2000 characters)"
              aria-invalid={!!errors.description}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : isEdit ? null : <Send className="size-4" />}
              {resubmitId ? (isSubmitting ? 'Resubmitting…' : 'Resubmit') : isEdit ? 'Save changes' : 'Submit'}
            </Button>
            {isEdit && onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function MilestonePageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading milestone">
      <Card>
        <CardHeader className="space-y-3">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    </div>
  );
}

