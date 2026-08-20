'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { getDb, todayIso } from '@ops-dashboard/core';
import { cn } from '@ops-dashboard/ui';
import { usePageVisibility } from '@/lib/use-page-visibility';
import { tasksForTodayRail, validRailEnd } from '@/lib/today-rail';

const HOUR_HEIGHT = 44;
const START_HOUR = 7;
const END_HOUR = 22;

export function TodayRail() {
  const [now, setNow] = useState(() => new Date());
  const visibility = usePageVisibility();

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (visibility !== 'visible') return;
    const id = window.setTimeout(() => setNow(new Date()), 0);
    return () => window.clearTimeout(id);
  }, [visibility]);

  const blocks = useLiveQuery(async () => {
    const today = todayIso();
    const all = await getDb().tasks.toArray();
    return tasksForTodayRail(all, today);
  });

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const minutesIntoDay = (d: Date) => (d.getHours() - START_HOUR) * 60 + d.getMinutes();
  const nowOffset = (minutesIntoDay(now) / 60) * HOUR_HEIGHT;
  const nextBlock = blocks?.filter((task) => Date.parse(task.startAt!) >= now.getTime())[0];

  return (
    <div className="surface flex h-full flex-col overflow-hidden">
      <div className="hairline border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-subtle-foreground font-mono text-[10px] tracking-[0.2em] uppercase">
              Hour rail
            </div>
            <div className="mt-0.5 text-sm font-medium">{format(now, 'EEEE')}</div>
          </div>
          <div className="text-right">
            <div className="text-muted-foreground font-mono text-xs tabular-nums">
              {format(now, 'HH:mm')}
            </div>
            <div className="text-subtle-foreground mt-0.5 font-mono text-[10px]">
              {blocks ? `${blocks.length} block${blocks.length === 1 ? '' : 's'}` : 'loading'}
            </div>
          </div>
        </div>
        <div className="bg-bg-sunken mt-3 rounded-[12px] border px-3 py-2">
          <div className="text-subtle-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
            Next block
          </div>
          <div className="text-muted-foreground mt-0.5 truncate text-xs">
            {nextBlock
              ? `${format(new Date(nextBlock.startAt!), 'HH:mm')} · ${nextBlock.title}`
              : 'No upcoming time block'}
          </div>
        </div>
      </div>
      <div className="relative flex-1 scrollbar-thin overflow-y-auto">
        <div className="relative" style={{ height: hours.length * HOUR_HEIGHT }}>
          {hours.map((h, i) => (
            <div
              key={h}
              className="hairline absolute right-0 left-12 border-t"
              style={{ top: i * HOUR_HEIGHT }}
            >
              <span className="text-subtle-foreground absolute -top-2 -left-12 w-10 text-right font-mono text-[10px]">
                {h.toString().padStart(2, '0')}:00
              </span>
            </div>
          ))}
          {blocks?.map((t) => {
            const start = new Date(t.startAt!);
            const end = validRailEnd(t.startAt!, t.endAt);
            const top = (minutesIntoDay(start) / 60) * HOUR_HEIGHT;
            const height = end
              ? Math.max(20, ((end.getTime() - start.getTime()) / 1000 / 60 / 60) * HOUR_HEIGHT)
              : 32;
            return (
              <div
                key={t.id}
                className={cn(
                  'border-primary/30 bg-primary/15 text-foreground absolute right-2 left-14 rounded-md border px-2 py-1 text-[11px]',
                  'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]',
                )}
                style={{ top, height }}
              >
                <div className="truncate font-medium">{t.title}</div>
                <div className="text-muted-foreground font-mono text-[10px]">
                  {format(start, 'HH:mm')}
                  {end ? <> to {format(end, 'HH:mm')}</> : null}
                </div>
              </div>
            );
          })}
          {blocks && blocks.length === 0 ? (
            <div className="bg-card/80 text-muted-foreground absolute top-16 right-2 left-14 rounded-[14px] border border-dashed px-3 py-4 text-center text-xs leading-5">
              Schedule a task with a start time to make the rail operational.
            </div>
          ) : null}
          {nowOffset >= 0 && nowOffset <= hours.length * HOUR_HEIGHT ? (
            <div
              className="absolute right-0 left-12 z-10 flex items-center"
              style={{ top: nowOffset }}
            >
              <span className="bg-primary -ml-1.5 size-2.5 rounded-full shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-primary)_30%,transparent)]" />
              <span className="bg-primary/60 h-px flex-1" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
