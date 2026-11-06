import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { GraduationCap, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/auth/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { roleLabel, type User } from '@/lib/api';

// App shell from docs/design.md section 5: sticky top bar, then a centred content column.
export function AppShell({ user, children }: { user: User; children: ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  }

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-10 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-5" />
            <span className="font-semibold">CPMS</span>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden truncate text-sm font-medium sm:block" title={user.email}>
              {user.name}
            </span>
            <Badge variant="secondary">{roleLabel[user.role]}</Badge>
            <Button variant="ghost" size="sm" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">{children}</main>
    </div>
  );
}

// Loading state while the session check runs: same shape as the shell (design.md section 8).
export function AppShellSkeleton() {
  return (
    <div className="min-h-svh" aria-busy="true" aria-label="Loading">
      <div className="h-14 border-b">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between gap-4 px-4 md:px-6">
          <Skeleton className="h-5 w-24" />
          <div className="flex items-center gap-3">
            <Skeleton className="hidden h-4 w-24 sm:block" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}
