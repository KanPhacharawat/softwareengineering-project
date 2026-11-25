import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Lab 7 BR-06 v2: shown when the submission was saved inside the 24 h grace window (lateAt set).
export function LateBadge() {
  return (
    <Badge
      variant="outline"
      className="gap-1.5 font-medium bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
    >
      <Clock className="size-3" />
      <span>Late</span>
    </Badge>
  );
}
