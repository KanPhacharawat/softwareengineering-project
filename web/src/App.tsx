import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AuthProvider } from '@/auth/auth-context';
import { RequireAuth } from '@/auth/require-auth';
import { HomePage } from '@/pages/home-page';
import { LoginPage } from '@/pages/login-page';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route index element={<HomePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
