import type { ReactNode } from 'react';
import { CircleAlert, type LucideIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

export function ErrorState({ error }: { error: ApiError }) {
  const message = error.status === 404 ? 'Not found or you do not have access' : error.message;
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
