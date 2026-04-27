'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { addMonths, format, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DEFAULT_SETTINGS, getDb, isoDay, monthGrid } from '@drift/core';
import type { Priority } from '@drift/core';
import { useAppStore } from '@/lib/app-store';
import { cn } from '@drift/ui';

const PRIORITY_COLOR: Record<Priority, string> = {
  0: 'transparent',
  1: 'var(--color-priority-low)',
  2: 'var(--color-priority-med)',
  3: 'var(--color-priority-urgent)',
};

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

  const today = isoDay(new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const selectedDay = selected ?? today;
  const selectedTasks = (tasks ?? []).filter((t) => t.scheduledFor === selectedDay);
  const openEdit = useAppStore((s) => s.openEdit);

  return (
    <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setAnchor((d) => addMonths(d, -1))}
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
            aria-label="Next month"
            onClick={() => setAnchor((d) => addMonths(d, 1))}
            className="kbd"
          >
            <ChevronRight className="size-3" />
          </button>
          <span className="ml-2 text-sm font-semibold tracking-tight">
            {format(anchor, 'MMMM yyyy')}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-px rounded-xl border border-border bg-border">
          {labels.map((d) => (
            <div
              key={d}
              className="bg-bg-rail px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground"
            >
              {d}
            </div>
          ))}
          {days.map((day) => {
            const iso = isoDay(day);
            const dayTasks = (tasks ?? []).filter((t) => t.scheduledFor === iso);
            const inMonth = isSameMonth(day, anchor);
            const isToday = iso === today;
            const isSelected = iso === selectedDay;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelected(iso)}
                className={cn(
                  'flex min-h-[88px] flex-col gap-1 bg-card p-2 text-left transition-colors',
                  !inMonth && 'bg-bg-sunken text-muted-foreground/60',
                  isSelected && 'ring-2 ring-inset ring-primary/60',
                )}
              >
                <span
                  className={cn(
                    'font-mono text-xs',
                    isToday && 'inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground',
                  )}
                >
                  {format(day, 'd')}
                </span>
                <div className="flex flex-col gap-0.5">
                  {dayTasks.slice(0, 3).map((t) => (
                    <span
                      key={t.id}
                      className="flex items-center gap-1 truncate text-[11px]"
                    >
                      <span
                        aria-hidden
                        className="size-1.5 rounded-full"
                        style={{
                          background:
                            t.priority > 0 ? PRIORITY_COLOR[t.priority] : 'var(--color-primary)',
                        }}
                      />
                      <span className="truncate">{t.title}</span>
                    </span>
                  ))}
                  {dayTasks.length > 3 ? (
                    <span className="font-mono text-[10px] text-subtle-foreground">
                      +{dayTasks.length - 3}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <aside className="surface flex h-full min-h-[400px] flex-col overflow-hidden">
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
              {selectedTasks.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => openEdit(t.id)}
                    className="surface-flat flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm hover:border-border-strong"
                  >
                    <span
                      aria-hidden
                      className="size-1.5 rounded-full"
                      style={{
                        background:
                          t.priority > 0 ? PRIORITY_COLOR[t.priority] : 'var(--color-primary)',
                      }}
                    />
                    <span className="truncate">{t.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
