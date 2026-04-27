'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DEFAULT_SETTINGS, getDb, isoDay, weekDays } from '@drift/core';
import type { Task } from '@drift/core';
import { useAppStore } from '@/lib/app-store';
import { cn } from '@drift/ui';

const HOUR_HEIGHT = 48;
const START_HOUR = 6;
const END_HOUR = 23;

export function CalendarWeek() {
  const settings = useLiveQuery(async () => getDb().settings.get('singleton'));
  const weekStartsOn = (settings?.weekStartsOn ?? DEFAULT_SETTINGS.weekStartsOn) as 0 | 1;
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const days = weekDays(anchor, weekStartsOn);

  const tasks = useLiveQuery(async () => {
    const all = await getDb().tasks.toArray();
    return all.filter((t) => !t.deletedAt && t.startAt);
  });

  const openEdit = useAppStore((s) => s.openEdit);
  const today = isoDay(new Date());
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous week"
          onClick={() => setAnchor((d) => addDays(d, -7))}
          className="kbd"
        >
          <ChevronLeft className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => setAnchor(new Date())}
          className="rounded-md border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Today
        </button>
        <button
          type="button"
          aria-label="Next week"
          onClick={() => setAnchor((d) => addDays(d, 7))}
          className="kbd"
        >
          <ChevronRight className="size-3" />
        </button>
        <span className="ml-2 font-mono text-[11px] text-subtle-foreground">
          Week of {format(startOfWeek(anchor, { weekStartsOn }), 'MMM d')}
        </span>
      </div>
      <div className="surface flex flex-1 overflow-hidden">
        <div className="scrollbar-thin flex flex-1 overflow-auto">
          <div
            className="grid w-full"
            style={{ gridTemplateColumns: `48px repeat(7, minmax(120px, 1fr))` }}
          >
            <div />
            {days.map((d) => {
              const isToday = isoDay(d) === today;
              return (
                <div
                  key={isoDay(d)}
                  className={cn(
                    'sticky top-0 z-10 border-b border-hairline bg-card/95 px-2 py-2 text-center backdrop-blur',
                    isToday && 'text-primary',
                  )}
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
                    {format(d, 'EEE')}
                  </div>
                  <div className="text-sm font-semibold">{format(d, 'd')}</div>
                </div>
              );
            })}
            {hours.map((h) => (
              <Hour key={h} hour={h} days={days} tasks={tasks ?? []} onOpen={openEdit} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Hour({
  hour,
  days,
  tasks,
  onOpen,
}: {
  hour: number;
  days: Date[];
  tasks: Task[];
  onOpen: (id: string) => void;
}) {
  return (
    <>
      <div className="hairline -mt-2 border-t pr-1 text-right font-mono text-[10px] text-subtle-foreground">
        {hour.toString().padStart(2, '0')}
      </div>
      {days.map((day) => {
        const dayIso = isoDay(day);
        const blocks = tasks.filter((t) => {
          const start = parseISO(t.startAt!);
          return isoDay(start) === dayIso && start.getHours() === hour;
        });
        return (
          <div
            key={`${dayIso}-${hour}`}
            className="hairline relative border-t border-l"
            style={{ height: HOUR_HEIGHT }}
          >
            {blocks.map((t) => {
              const start = parseISO(t.startAt!);
              const end = t.endAt ? parseISO(t.endAt) : null;
              const minutes = end
                ? Math.max(15, (end.getTime() - start.getTime()) / 60000)
                : 30;
              const top = (start.getMinutes() / 60) * HOUR_HEIGHT;
              const height = (minutes / 60) * HOUR_HEIGHT - 2;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onOpen(t.id)}
                  className="absolute right-0.5 left-0.5 truncate rounded-md border border-primary/30 bg-primary/15 px-1.5 py-1 text-left text-[11px] text-foreground transition-colors hover:border-primary/60"
                  style={{ top, height }}
                >
                  <div className="truncate font-medium">{t.title}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {format(start, 'HH:mm')}
                  </div>
                </button>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
