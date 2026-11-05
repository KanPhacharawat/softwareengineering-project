import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError, fmtDate, type Milestone, type Submission } from '../api';
import { useAuth } from '../auth';
import { ErrorBanner, FieldError, Loading, StatusBadge, useLoad } from '../components/ui';

type Detail = { milestone: Milestone; team: { id: string; name: string }; submission: Submission | null };

export function MilestonePage() {
  const { milestoneId = '' } = useParams();
  const { user } = useAuth();
  const { loading, error, data, reload } = useLoad(() => api<Detail>(`/milestones/${milestoneId}`), [milestoneId]);
  const [editing, setEditing] = useState(false);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBanner message={error ?? 'Not found'} />;
  const { milestone: m, team, submission: s } = data;
  const pastDue = new Date(m.dueAt).getTime() <= Date.now();
  const locked = !!s?.feedback;
  const isStudent = user?.role === 'STUDENT';
  const canChange = isStudent && !pastDue && !locked;

  return (
    <>
      <p><Link to={`/teams/${team.id}`}>← {team.name}</Link></p>
      <h1>{m.title} <StatusBadge status={m.status} /></h1>
      <p className="muted">Due {fmtDate(m.dueAt)} (Bangkok time)</p>
      {m.description && <p>{m.description}</p>}

      <h2>Submission</h2>
      {s && !editing && (
        <div className="card" data-testid="submission">
          <h3>{s.title}</h3>
          {s.description && <p>{s.description}</p>}
          <p><a href={s.link} target="_blank" rel="noreferrer">{s.link}</a></p>
          <p className="muted">Last updated by {s.submittedBy.name} at {fmtDate(s.updatedAt)}</p>
          {canChange && <button className="secondary" onClick={() => setEditing(true)}>Edit submission</button>}
        </div>
      )}
      {!s && !canChange && <p className="empty">No submission yet.</p>}
      {isStudent && locked && <p className="notice">Locked after feedback.</p>}
      {isStudent && !locked && pastDue && <p className="notice">Submission closed: deadline passed.</p>}
      {canChange && (!s || editing) && (
        <SubmissionForm milestoneId={m.id} existing={s} onDone={() => { setEditing(false); reload(); }} onCancel={s ? () => setEditing(false) : undefined} />
      )}

      <h2>Feedback</h2>
      {s?.feedback ? (
        <div className="card feedback" data-testid="feedback">
          <p>{s.feedback.comment}</p>
          <p className="muted">{s.feedback.author.name} · {fmtDate(s.feedback.createdAt)}</p>
        </div>
      ) : user?.role === 'SUPERVISOR' && s ? (
        <FeedbackForm submissionId={s.id} onDone={reload} />
      ) : (
        <p className="empty">No feedback yet.</p>
      )}
    </>
  );
}

function SubmissionForm({ milestoneId, existing, onDone, onCancel }: { milestoneId: string; existing: Submission | null; onDone: () => void; onCancel?: () => void }) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [link, setLink] = useState(existing?.link ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setFields({});
    try {
      await api(`/milestones/${milestoneId}/submission`, { method: existing ? 'PUT' : 'POST', body: { title, description, link } });
      onDone();
    } catch (err) {
      if (err instanceof ApiError) { setError(err.message); setFields(err.fields); } else setError('Could not save submission');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} aria-label="Submission">
      <ErrorBanner message={error} />
      <label>Title<input name="title" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <FieldError error={fields.title} />
      <label>Description<textarea name="description" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      <FieldError error={fields.description} />
      <label>Link<input name="link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" /></label>
      <FieldError error={fields.link} />
      <div className="row">
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : existing ? 'Save changes' : 'Submit work'}</button>
        {onCancel && <button type="button" className="secondary" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

function FeedbackForm({ submissionId, onDone }: { submissionId: string; onDone: () => void }) {
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setFields({});
    try {
      await api(`/submissions/${submissionId}/feedback`, { method: 'POST', body: { comment } });
      onDone();
    } catch (err) {
      if (err instanceof ApiError) { setError(err.message); setFields(err.fields); } else setError('Could not save feedback');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} aria-label="Feedback">
      <ErrorBanner message={error} />
      <label>Feedback<textarea name="comment" value={comment} onChange={(e) => setComment(e.target.value)} /></label>
      <FieldError error={fields.comment} />
      <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save feedback'}</button>
    </form>
  );
}
