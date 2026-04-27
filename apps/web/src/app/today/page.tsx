import { format } from 'date-fns';
import { Focus } from 'lucide-react';
import { ViewShell } from '@/components/view-shell';
import { TaskList } from '@/components/task-list';
import { TodayRail } from '@/components/today-rail';
import { TodayStats } from '@/components/today-stats';

export default function TodayPage() {
  const now = new Date();
  return (
    <ViewShell
      eyebrow={format(now, 'EEEE')}
      title={format(now, 'MMMM d')}
      subtitle="The hero view. Capture, schedule, and ship."
      meta={<TodayStats />}
      actions={
        <button
          type="button"
          className="hairline inline-flex h-9 items-center gap-2 rounded-[10px] border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Focus className="size-3.5 text-primary" aria-hidden />
          Focus mode
        </button>
      }
      rail={<TodayRail />}
    >
      <TaskList filter="today" />
    </ViewShell>
  );
}
