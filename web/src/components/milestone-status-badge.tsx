import { CircleCheck, CircleDot, CircleX, Clock, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { MilestoneStatus } from '@/lib/api';
import { cn } from '@/lib/utils';

const config: Record<
  MilestoneStatus,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  OPEN: {
    label: 'OPEN',
    className: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900',
    icon: CircleDot,
  },
  SUBMITTED: {
    label: 'SUBMITTED',
    className:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900',
    icon: Clock,
  },
  FEEDBACK_GIVEN: {
    label: 'FEEDBACK_GIVEN',
    className:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900',
    icon: CircleCheck,
  },
  REVISION_REQUESTED: {
    label: 'Revision requested',
    className:
      'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900',
    icon: RotateCcw,
  },
  MISSED: {
    label: 'MISSED',
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900',
    icon: CircleX,
  },
};

export function MilestoneStatusBadge({ status }: { status: MilestoneStatus }) {
  const item = config[status] ?? config.OPEN;
  const Icon = item.icon;

  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium', item.className)}>
      <Icon className="size-3" />
      <span>{item.label}</span>
    </Badge>
  );
}

