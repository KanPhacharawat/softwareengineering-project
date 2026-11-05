import { Link } from 'react-router-dom';
import { api, type Team } from '../api';
import { useAuth } from '../auth';
import { Empty, ErrorBanner, Loading, useLoad } from '../components/ui';

export function TeamsPage() {
  const { user } = useAuth();
  const { loading, error, data } = useLoad(() => api<{ teams: Team[] }>('/teams'), []);
  return (
    <>
      <h1>{user?.role === 'SUPERVISOR' ? 'My supervised teams' : 'My team'}</h1>
      {loading && <Loading />}
      <ErrorBanner message={error} />
      {data && data.teams.length === 0 && <Empty>No teams are assigned to you yet.</Empty>}
      <div className="grid">
        {data?.teams.map((t) => (
          <Link key={t.id} to={`/teams/${t.id}`} className="card link-card">
            <h2>{t.name}</h2>
            <p className="muted">Supervisor: {t.supervisor.name}</p>
            <p>{t.members.map((m) => m.name).join(', ')}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
