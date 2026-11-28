import type { ReactNode } from 'react';
import { CircleAlert, RotateCw, type LucideIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { ApiError } from '@/lib/api';

// Empty and error states shared by every data page (design.md section 8).
export function EmptyState({ icon: Icon, message, children }: { icon: LucideIcon; message: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
      <Icon className="size-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {children}
    </div>
  );
}

// F-11: Try again only when retrying can help (network error = status 0, or 5xx), never for 403/404.
export function ErrorState({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const message = error.status === 404 ? 'Not found or you do not have access' : error.message;
  const canRetry = onRetry && (error.status === 0 || error.status >= 500);
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertDescription>
        {message}
        {canRetry && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            <RotateCw />
            Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
