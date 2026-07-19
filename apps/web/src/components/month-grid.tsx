'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { addMonths, format, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DEFAULT_SETTINGS, getDb, isoDay, monthGrid } from '@ops-dashboard/core';
import type { Project } from '@ops-dashboard/core';
import { useAppStore } from '@/lib/app-store';
import { OrgLaneLegend, useOrgLanes } from '@/components/org-legend';
import { cn } from '@ops-dashboard/ui';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function MonthGrid() {
  const settings = useLiveQuery(async () => getDb().settings.get('singleton'));
  const weekStartsOn = (settings?.weekStartsOn ?? DEFAULT_SETTINGS.weekStartsOn) as 0 | 1;
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const days = monthGrid(anchor, weekStartsOn);
  const labels =
    weekStartsOn === 1 ? WEEKDAY_LABELS : ['Sun', ...WEEKDAY_LABELS.slice(0, 6)];

  const tasks = useLiveQuery(async () => {
    const all = await getDb().tasks.toArray();
    return all.filter((t) => !t.deletedAt && t.scheduledFor);
  });
  const projectsMap = useLiveQuery(async () => {
    const all = await getDb().projects.toArray();
    return new Map<string, Project>(all.filter((p) => !p.deletedAt).map((p) => [p.id, p]));
  });

  const lanes = useOrgLanes(projectsMap);
  const visibleTasks = (tasks ?? []).filter((t) => lanes.visible(t));

  const today = isoDay(new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const selectedDay = selected ?? today;
  const selectedTasks = visibleTasks.filter((t) => t.scheduledFor === selectedDay);
  const openEdit = useAppStore((s) => s.openEdit);

  return (
    <div className="grid h-full min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border bg-card p-0.5">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setAnchor((d) => addMonths(d, -1))}
            className="inline-flex size-10 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setAnchor(new Date())}
            className="h-10 border-x px-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setAnchor((d) => addMonths(d, 1))}
            className="inline-flex size-10 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
          </div>
          <span aria-live="polite" className="ml-1 text-sm font-semibold md:ml-2">
            {format(anchor, 'MMMM yyyy')}
          </span>
          {lanes.showLegend ? (
            <div className="min-w-0 md:ml-auto">
              <OrgLaneLegend lanes={lanes.lanes} hidden={lanes.hidden} onToggle={lanes.toggle} />
            </div>
          ) : null}
        </div>
        <div className="grid min-w-0 grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
          {labels.map((d) => (
            <div
              key={d}
              className="bg-bg-rail px-1 py-1.5 text-center font-mono text-[9px] uppercase tracking-[0.08em] text-subtle-foreground sm:px-2 sm:text-[10px] sm:tracking-[0.18em]"
            >
              {d}
            </div>
          ))}
          {days.map((day) => {
            const iso = isoDay(day);
            const dayTasks = visibleTasks.filter((t) => t.scheduledFor === iso);
            const inMonth = isSameMonth(day, anchor);
            const isToday = iso === today;
            const isSelected = iso === selectedDay;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelected(iso)}
                aria-label={`${format(day, 'MMMM d')}, ${dayTasks.length} ${dayTasks.length === 1 ? 'task' : 'tasks'}`}
                className={cn(
                  'flex min-h-[54px] min-w-0 flex-col gap-1 bg-card p-1.5 text-left transition-colors sm:min-h-[88px] sm:p-2',
                  !inMonth && 'bg-bg-sunken text-muted-foreground/60',
                  isSelected && 'ring-2 ring-inset ring-primary/60',
                )}
              >
                <span className="flex w-full items-center justify-between gap-1">
                  <span
                    className={cn(
                      'font-mono text-xs',
                      isToday && 'inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground',
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayTasks.length > 0 ? (
                    <span className="font-mono text-[9px] text-subtle-foreground sm:hidden">
                      {dayTasks.length}
                    </span>
                  ) : null}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex flex-wrap gap-0.5 sm:hidden">
                    {dayTasks.slice(0, 4).map((t) => (
                      <span
                        key={t.id}
                        aria-hidden
                        className="size-1.5 rounded-full"
                        style={{ background: lanes.colorOf(lanes.laneOf(t)) }}
                      />
                    ))}
                    {dayTasks.length > 4 ? (
                      <span className="font-mono text-[9px] text-subtle-foreground">
                        +{dayTasks.length - 4}
                      </span>
                    ) : null}
                  </div>
                  {dayTasks.slice(0, 3).map((t) => (
                    <span
                      key={t.id}
                      className="hidden min-w-0 items-center gap-1 truncate text-[11px] sm:flex"
                    >
                      <span
                        aria-hidden
                        className="size-1.5 rounded-full"
                        style={{ background: lanes.colorOf(lanes.laneOf(t)) }}
                      />
                      <span className="truncate">{t.title}</span>
                    </span>
                  ))}
                  {dayTasks.length > 3 ? (
                    <span className="hidden font-mono text-[10px] text-subtle-foreground sm:inline">
                      +{dayTasks.length - 3}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <aside className="surface flex h-full min-h-[280px] min-w-0 flex-col overflow-hidden lg:min-h-[400px]">
        <header className="border-b border-hairline px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-subtle-foreground">
            Day detail
          </div>
          <div className="mt-1 text-base font-semibold tracking-tight">
            {format(new Date(`${selectedDay}T00:00:00`), 'EEEE, MMMM d')}
          </div>
        </header>
        <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
          {selectedTasks.length === 0 ? (
            <div className="px-2 py-6 text-center text-xs text-muted-foreground">
              Nothing scheduled.
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {selectedTasks.map((t) => {
                const project = t.projectId ? projectsMap?.get(t.projectId) : undefined;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => openEdit(t.id)}
                      className="surface-flat flex w-full flex-col gap-1 px-2.5 py-2 text-left text-sm hover:border-border-strong"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ background: lanes.colorOf(lanes.laneOf(t)) }}
                        />
                        <span className="truncate">{t.title}</span>
                      </div>
                      {project ? (
                        <div className="ml-3.5 flex items-center gap-1 text-[10px] text-subtle-foreground">
                          <span
                            aria-hidden
                            className="size-1.5 rounded-full"
                            style={{ background: project.color }}
                          />
                          <span className="truncate">{project.name}</span>
                        </div>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
