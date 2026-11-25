import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// F-07: separate Closed badge displayed next to MilestoneStatusBadge when milestone.closedAt is set.
export function ClosedBadge() {
  return (
    <Badge
      variant="outline"
      className="gap-1.5 font-medium bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700"
    >
      <Lock className="size-3" />
      <span>Closed</span>
    </Badge>
  );
}
