'use client';

import { useEffect, useState } from 'react';
import { ActivityCalendar } from 'react-activity-calendar';
import { CalendarDays } from 'lucide-react';
import { cn } from '@ops-dashboard/ui';
import type { ActivityDay } from '@/lib/activity';

interface ActivityHeatmapProps {
  data: ActivityDay[];
}

/*
  Five-step amber ramps derived from the project oklch palette.
  Level 0 is the faint surface/sunken color; levels 1-4 escalate
  through the burnt-amber primary signature.

  Light mode ramp  (warm paper → burnt amber)
    0: oklch(0.96 0.006 80)   ~ bg-sunken  →  #F2EDE4
    1: oklch(0.92 0.04  50)   soft peach   →  #EDD8C0
    2: oklch(0.82 0.10  42)   light amber  →  #D4A96A
    3: oklch(0.72 0.15  38)   amber        →  #B87A2F
    4: oklch(0.60 0.20  35)   deep amber   →  #8C4E0A

  Dark mode ramp  (deep bg → bright amber)
    0: oklch(0.19 0.01 280)   ~ bg-raised  →  #27252F
    1: oklch(0.28 0.06  42)   muted amber  →  #3D2E19
    2: oklch(0.42 0.11  40)   warm mid     →  #6B4118
    3: oklch(0.60 0.18  40)   amber        →  #A3601A
    4: oklch(0.74 0.17  42)   bright amber →  #C9882E

  Using CSS var-backed hex approximations so we stay consistent with
  the design system while satisfying react-activity-calendar's
  plain-string color requirement.
*/
const LIGHT_RAMP: [string, string, string, string, string] = [
  '#F2EDE4', // level 0 – faint paper
  '#EDD8C0', // level 1 – soft peach
  '#D4A96A', // level 2 – light amber
  '#B87A2F', // level 3 – amber
  '#8C4E0A', // level 4 – deep amber
];

const DARK_RAMP: [string, string, string, string, string] = [
  '#27252F', // level 0 – deep bg
  '#3D2E19', // level 1 – muted amber shadow
  '#6B4118', // level 2 – warm mid
  '#A3601A', // level 3 – amber
  '#C9882E', // level 4 – bright amber
];

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const [dark, setDark] = useState(true);
  const total = data.reduce((sum, day) => sum + day.count, 0);
  const activeDays = data.filter((day) => day.count > 0).length;
  const peak = Math.max(0, ...data.map((day) => day.count));

  useEffect(() => {
    const html = document.documentElement;
    const check = () => setDark(html.classList.contains('dark'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  if (!data || data.length === 0) {
    return (
      <div
        className={cn(
          'surface flex items-center justify-center p-8 text-sm text-muted-foreground',
        )}
      >
        No activity data yet — start completing tasks, routines, and journal
        entries.
      </div>
    );
  }

  return (
    <div
      className={cn(
        'surface overflow-hidden p-0',
      )}
    >
      <div className="hairline flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
            <CalendarDays className="size-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Year identity ledger</h2>
            <p className="text-xs text-muted-foreground">Every completed action leaves a mark.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <MiniMetric label="points" value={total} />
          <MiniMetric label="days" value={activeDays} />
          <MiniMetric label="peak" value={peak} />
        </div>
      </div>
      <div className="scrollbar-thin overflow-x-auto p-5">
        <ActivityCalendar
          data={data}
          maxLevel={4}
          weekStart={1}
          colorScheme={dark ? 'dark' : 'light'}
          theme={{
            light: LIGHT_RAMP,
            dark: DARK_RAMP,
          }}
          showWeekdayLabels
          fontSize={11}
          labels={{
            totalCount: '{{count}} activity points in the last year',
          }}
          style={{
            color: dark
              ? 'oklch(0.96 0.005 80)'
              : 'oklch(0.48 0.015 280)',
          }}
        />
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[54px] rounded-[10px] border bg-bg-sunken px-2 py-1.5">
      <div className="font-mono text-sm font-semibold tabular-nums">{value}</div>
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-subtle-foreground">
        {label}
      </div>
    </div>
  );
}
