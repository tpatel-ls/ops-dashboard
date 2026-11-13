'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { Flame, ListTodo, Target } from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import { useToday } from '@/lib/use-today';
import { summarizeTodayTasks } from '@/lib/task-dates';

export function TodayStats() {
  const today = useToday();
  const stats = useLiveQuery(
    async () => summarizeTodayTasks(await getDb().tasks.toArray(), today),
    [today],
  );

  // Until the tasks load there is nothing to count, so show a placeholder
  // rather than a confident "0 Overdue".
  const items = [
    { label: 'Brief', value: stats?.total ?? '-', icon: ListTodo, tone: 'text-foreground' },
    { label: 'Done', value: stats?.done ?? '-', icon: Target, tone: 'text-success' },
    { label: 'Overdue', value: stats?.overdue ?? '-', icon: Flame, tone: 'text-priority-urgent' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2" aria-busy={stats === undefined}>
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div
            key={it.label}
            className="bg-card/70 flex min-w-[86px] items-center gap-2 rounded-[12px] border px-2.5 py-2 shadow-sm backdrop-blur"
          >
            <span className="bg-bg-sunken flex size-7 items-center justify-center rounded-[9px]">
              <Icon className={`size-3.5 ${it.tone}`} aria-hidden />
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-sm font-semibold tabular-nums">{it.value}</span>
              <span className="text-subtle-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
                {it.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
