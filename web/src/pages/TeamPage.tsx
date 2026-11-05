import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError, fmtDate, type Milestone, type Team } from '../api';
import { useAuth } from '../auth';
import { Empty, ErrorBanner, FieldError, Loading, StatusBadge, useLoad } from '../components/ui';

export function TeamPage() {
  const { teamId = '' } = useParams();
  const { user } = useAuth();
  const team = useLoad(() => api<{ team: Team }>(`/teams/${teamId}`), [teamId]);
  const milestones = useLoad(() => api<{ milestones: Milestone[] }>(`/teams/${teamId}/milestones`), [teamId]);

  if (team.loading) return <Loading />;
  if (team.error || !team.data) return <ErrorBanner message={team.error ?? 'Not found'} />;
  const t = team.data.team;

  return (
    <>
      <p><Link to="/">← Teams</Link></p>
      <h1>{t.name}</h1>
      <p className="muted">Supervisor: {t.supervisor.name} · Members: {t.members.map((m) => m.name).join(', ')}</p>

      <h2>Milestones</h2>
      {milestones.loading && <Loading />}
      <ErrorBanner message={milestones.error} />
      {milestones.data && milestones.data.milestones.length === 0 && <Empty>No milestones yet.</Empty>}
      {milestones.data && milestones.data.milestones.length > 0 && (
        <table>
          <thead><tr><th>Milestone</th><th>Due (Bangkok)</th><th>Status</th></tr></thead>
          <tbody>
            {milestones.data.milestones.map((m) => (
              <tr key={m.id}>
                <td><Link to={`/milestones/${m.id}`}>{m.title}</Link></td>
                <td>{fmtDate(m.dueAt)}</td>
                <td><StatusBadge status={m.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {user?.role === 'SUPERVISOR' && <NewMilestoneForm teamId={t.id} onCreated={milestones.reload} />}
    </>
  );
}

function NewMilestoneForm({ teamId, onCreated }: { teamId: string; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      // datetime-local is the browser's local time; convert to ISO (UTC) for the API.
      const dueAt = due ? new Date(due).toISOString() : '';
      await api(`/teams/${teamId}/milestones`, { method: 'POST', body: { title, description, dueAt } });
      setTitle(''); setDescription(''); setDue('');
      onCreated();
    } catch (err) {
      if (err instanceof ApiError) { setError(err.message); setFields(err.fields); } else setError('Could not create milestone');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} aria-label="New milestone">
      <h2>New milestone</h2>
      <ErrorBanner message={error} />
      <label>Title<input name="title" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <FieldError error={fields.title} />
      <label>Description<textarea name="description" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      <FieldError error={fields.description} />
      <label>Due date and time<input name="dueAt" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} /></label>
      <FieldError error={fields.dueAt} />
      <button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create milestone'}</button>
    </form>
  );
}
