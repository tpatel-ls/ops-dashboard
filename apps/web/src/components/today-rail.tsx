'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, parseISO } from 'date-fns';
import { getDb } from '@drift/core';
import { cn } from '@drift/ui';

const HOUR_HEIGHT = 44;
const START_HOUR = 7;
const END_HOUR = 22;

export function TodayRail() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const blocks = useLiveQuery(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const all = await getDb().tasks.toArray();
    return all.filter((t) => !t.deletedAt && t.startAt && t.startAt.slice(0, 10) === today);
  });

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const minutesIntoDay = (d: Date) => (d.getHours() - START_HOUR) * 60 + d.getMinutes();
  const nowOffset = (minutesIntoDay(now) / 60) * HOUR_HEIGHT;

  return (
    <div className="surface flex h-full flex-col overflow-hidden">
      <div className="hairline flex items-center justify-between border-b px-4 py-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtle-foreground">
            Hour rail
          </div>
          <div className="mt-0.5 text-sm font-medium">{format(now, 'EEEE')}</div>
        </div>
        <div className="font-mono text-xs tabular-nums text-muted-foreground">
          {format(now, 'HH:mm')}
        </div>
      </div>
      <div className="scrollbar-thin relative flex-1 overflow-y-auto">
        <div className="relative" style={{ height: hours.length * HOUR_HEIGHT }}>
          {hours.map((h, i) => (
            <div
              key={h}
              className="hairline absolute right-0 left-12 border-t"
              style={{ top: i * HOUR_HEIGHT }}
            >
              <span className="absolute -top-2 -left-12 w-10 text-right font-mono text-[10px] text-subtle-foreground">
                {h.toString().padStart(2, '0')}:00
              </span>
            </div>
          ))}
          {blocks?.map((t) => {
            const start = parseISO(t.startAt!);
            const end = t.endAt ? parseISO(t.endAt) : null;
            const top = (minutesIntoDay(start) / 60) * HOUR_HEIGHT;
            const height = end
              ? Math.max(20, ((end.getTime() - start.getTime()) / 1000 / 60 / 60) * HOUR_HEIGHT)
              : 32;
            return (
              <div
                key={t.id}
                className={cn(
                  'absolute right-2 left-14 rounded-md border border-primary/30 bg-primary/15 px-2 py-1 text-[11px] text-foreground',
                  'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]',
                )}
                style={{ top, height }}
              >
                <div className="truncate font-medium">{t.title}</div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  {format(start, 'HH:mm')}
                  {end ? <> to {format(end, 'HH:mm')}</> : null}
                </div>
              </div>
            );
          })}
          {nowOffset >= 0 && nowOffset <= hours.length * HOUR_HEIGHT ? (
            <div
              className="absolute right-0 left-12 z-10 flex items-center"
              style={{ top: nowOffset }}
            >
              <span className="-ml-1.5 size-2.5 rounded-full bg-primary shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-primary)_30%,transparent)]" />
              <span className="h-px flex-1 bg-primary/60" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
