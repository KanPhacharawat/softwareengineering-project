// F-00 placeholder: proves the web app, design tokens and API proxy work. Real screens start in F-01.
import { useEffect, useState } from 'react';
import { CircleAlert, CircleCheck, GraduationCap, Loader2 } from 'lucide-react';

type Health = 'loading' | 'ok' | 'error';

export default function App() {
  const [health, setHealth] = useState<Health>('loading');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((body: { ok?: boolean }) => setHealth(body.ok ? 'ok' : 'error'))
      .catch(() => setHealth('error'));
  }, []);

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 md:px-6">
          <GraduationCap className="size-5" />
          <span className="font-semibold">CPMS</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Course Project Management System</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          ระบบจัดการโครงงานรายวิชา: milestones, submissions and feedback.
        </p>
        <p className="mt-6 flex items-center gap-2 text-sm" data-testid="api-status">
          {health === 'loading' && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          {health === 'ok' && <CircleCheck className="size-4 text-emerald-600" />}
          {health === 'error' && <CircleAlert className="size-4 text-destructive" />}
          {health === 'loading' ? 'Checking API…' : health === 'ok' ? 'API connected' : 'API unavailable'}
        </p>
      </main>
    </div>
  );
}
