import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { LoginPage } from './pages/LoginPage';
import { TeamsPage } from './pages/TeamsPage';
import { TeamPage } from './pages/TeamPage';
import { MilestonePage } from './pages/MilestonePage';
import { Loading } from './components/ui';
import './styles.css';

function Shell() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  if (loading) return <main className="container"><Loading /></main>;
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }
  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">CPMS</Link>
        <div className="who">
          <span data-testid="current-user">{user.name}</span>
          <span className="role">{user.role === 'SUPERVISOR' ? 'Supervisor' : 'Student'}</span>
          <button className="secondary" onClick={async () => { await logout(); navigate('/login'); }}>Log out</button>
        </div>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<TeamsPage />} />
          <Route path="/teams/:teamId" element={<TeamPage />} />
          <Route path="/milestones/:milestoneId" element={<MilestonePage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<p>Page not found. <Link to="/">Go home</Link></p>} />
        </Routes>
      </main>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
