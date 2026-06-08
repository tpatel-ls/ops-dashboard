'use client';

import { format } from 'date-fns';
import { Focus } from 'lucide-react';
import { ViewShell } from '@/components/view-shell';
import { TodayRail } from '@/components/today-rail';
import { TodayStats } from '@/components/today-stats';
import { TopThree } from '@/components/today/top-three';
import { OpenTasks } from '@/components/today/open-tasks';
import { RoutineChecklist } from '@/components/today/routine-checklist';
import { SlippingProjects } from '@/components/today/slipping-projects';
import { ResurfacingEntry } from '@/components/today/resurfacing-entry';
import { NotificationsFeed } from '@/components/today/notifications-feed';
import { useAppStore } from '@/lib/app-store';

export default function TodayPage() {
  const now = new Date();
  const openFocus = useAppStore((s) => s.openFocus);

  return (
    <ViewShell
      eyebrow={format(now, 'EEEE').toUpperCase()}
      title={format(now, 'MMMM d')}
      subtitle="The centerpiece. Capture, schedule, and ship."
      meta={<TodayStats />}
      actions={
        <button
          type="button"
          onClick={openFocus}
          className="hairline inline-flex h-9 items-center gap-2 rounded-[10px] border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Focus className="size-3.5 text-primary" aria-hidden />
          Focus mode
        </button>
      }
      rail={<TodayRail />}
    >
      <div className="flex flex-col gap-5">
        <TopThree />
        <OpenTasks />
        <div className="grid gap-5 lg:grid-cols-2">
          <RoutineChecklist />
          <div className="flex flex-col gap-5">
            <SlippingProjects />
            <ResurfacingEntry />
            <NotificationsFeed />
          </div>
        </div>
      </div>
    </ViewShell>
  );
}
