import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AuthProvider } from '@/auth/auth-context';
import { RequireAuth } from '@/auth/require-auth';
import { HomePage } from '@/pages/home-page';
import { LoginPage } from '@/pages/login-page';
import { MilestonePage } from '@/pages/milestone-page';
import { TeamPage } from '@/pages/team-page';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route index element={<HomePage />} />
            <Route path="teams/:teamId" element={<TeamPage />} />
            <Route path="milestones/:milestoneId" element={<MilestonePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
