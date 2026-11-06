import { Users } from 'lucide-react';
import { useAuth } from '@/auth/auth-context';

// `/` after login. The team list itself arrives with F-02; until then this page shows the empty state.
export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My teams</h1>
          {user && (
            <p className="mt-1 text-sm text-muted-foreground">
              Signed in as {user.name} ({user.email})
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
        <Users className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No teams to show yet</p>
      </div>
    </div>
  );
}
