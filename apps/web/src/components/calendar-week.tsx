'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DEFAULT_SETTINGS, getDb, isoDay, weekDays } from '@ops-dashboard/core';
import type { Project, Task } from '@ops-dashboard/core';
import { useAppStore } from '@/lib/app-store';
import { OrgLaneLegend, useOrgLanes } from '@/components/org-legend';
import { cn } from '@ops-dashboard/ui';
import { calendarDateOf, calendarKindOf, compareCalendarTasks } from '@/lib/calendar-agenda';

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
    return all.filter(
      (task) =>
        !task.deletedAt &&
        task.status !== 'archived' &&
        task.status !== 'done' &&
        Boolean(calendarDateOf(task)),
    );
  });
  const projectsMap = useLiveQuery(async () => {
    const all = await getDb().projects.toArray();
    return new Map<string, Project>(all.filter((p) => !p.deletedAt).map((p) => [p.id, p]));
  });

  const lanes = useOrgLanes(projectsMap);
  const visibleTasks = (tasks ?? []).filter((t) => lanes.visible(t));
  const timedTasks = visibleTasks.filter((task) => task.startAt);

  const openEdit = useAppStore((s) => s.openEdit);
  const today = isoDay(new Date());
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  return (
    <div className="flex h-full min-w-0 flex-col gap-3">
      <div className="surface flex min-w-0 flex-wrap items-center gap-2 p-2">
        <button
          type="button"
          aria-label="Previous week"
          onClick={() => setAnchor((d) => addDays(d, -7))}
          className="inline-flex size-10 items-center justify-center rounded-md border bg-card text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => setAnchor(new Date())}
          className="min-h-10 rounded-md border bg-card px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Today
        </button>
        <button
          type="button"
          aria-label="Next week"
          onClick={() => setAnchor((d) => addDays(d, 7))}
          className="inline-flex size-10 items-center justify-center rounded-md border bg-card text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="size-3" />
        </button>
        <span className="ml-1 text-xs font-semibold text-foreground md:ml-2">
          {format(startOfWeek(anchor, { weekStartsOn }), 'MMM d')} to {format(addDays(startOfWeek(anchor, { weekStartsOn }), 6), 'MMM d')}
        </span>
        {lanes.showLegend ? (
          <div className="min-w-0 md:ml-auto">
            <OrgLaneLegend lanes={lanes.lanes} hidden={lanes.hidden} onToggle={lanes.toggle} />
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 md:hidden">
        {days.map((day) => (
          <MobileDayAgenda
            key={isoDay(day)}
            day={day}
            tasks={visibleTasks}
            laneColor={(t) => lanes.colorOf(lanes.laneOf(t))}
            onOpen={openEdit}
          />
        ))}
      </div>
      <div className="surface hidden flex-1 overflow-hidden md:flex">
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
              <Hour
                key={h}
                hour={h}
                days={days}
                tasks={timedTasks}
                laneColor={(t) => lanes.colorOf(lanes.laneOf(t))}
                onOpen={openEdit}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileDayAgenda({
  day,
  tasks,
  laneColor,
  onOpen,
}: {
  day: Date;
  tasks: Task[];
  laneColor: (t: Task) => string;
  onOpen: (id: string) => void;
}) {
  const dayIso = isoDay(day);
  const blocks = tasks
    .filter((task) => calendarDateOf(task) === dayIso)
    .sort(compareCalendarTasks);
  return (
    <section className="surface-flat min-w-0 p-3">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
            {format(day, 'EEE')}
          </div>
          <div className="text-lg font-semibold leading-none tracking-tight">
            {format(day, 'MMM d')}
          </div>
        </div>
        <span className="font-mono text-[10px] text-subtle-foreground">{blocks.length}</span>
      </div>
      {blocks.length === 0 ? (
        <p className="rounded-[12px] border border-dashed bg-bg-sunken/60 px-3 py-3 text-xs text-muted-foreground">
          No time blocks.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {blocks.map((task) => {
            const kind = calendarKindOf(task);
            const start = task.startAt ? parseISO(task.startAt) : null;
            const color = laneColor(task);
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => onOpen(task.id)}
                className="flex min-w-0 items-center gap-2 rounded-[12px] border bg-bg-sunken/60 px-3 py-2 text-left"
                style={{ borderColor: `color-mix(in oklch, ${color} 34%, var(--border))` }}
              >
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: color }}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{task.title}</span>
                <span className={cn(
                  'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                  kind === 'due' ? 'bg-warning/10 text-warning' : 'bg-card text-subtle-foreground',
                )}>
                  {start ? format(start, 'h:mm a') : kind === 'due' ? 'Due' : 'Scheduled'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Hour({
  hour,
  days,
  tasks,
  laneColor,
  onOpen,
}: {
  hour: number;
  days: Date[];
  tasks: Task[];
  laneColor: (t: Task) => string;
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
              const color = laneColor(t);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onOpen(t.id)}
                  className="absolute right-0.5 left-0.5 truncate rounded-md border px-1.5 py-1 text-left text-[11px] text-foreground transition-all hover:brightness-110"
                  style={{
                    top,
                    height,
                    background: `color-mix(in oklch, ${color} 16%, transparent)`,
                    borderColor: `color-mix(in oklch, ${color} 40%, transparent)`,
                  }}
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
