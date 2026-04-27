'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { Flame, ListTodo, Target } from 'lucide-react';
import { getDb } from '@drift/core';

export function TodayStats() {
  const stats = useLiveQuery(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const all = await getDb().tasks.toArray();
    const live = all.filter((t) => !t.deletedAt && t.status !== 'archived');
    const todays = live.filter(
      (t) => t.scheduledFor === today || (t.dueAt && t.dueAt.slice(0, 10) <= today),
    );
    const done = todays.filter((t) => t.status === 'done').length;
    const overdue = live.filter(
      (t) =>
        t.status !== 'done' &&
        ((t.dueAt && t.dueAt.slice(0, 10) < today) ||
          (t.scheduledFor && t.scheduledFor < today)),
    ).length;
    return {
      total: todays.length,
      done,
      overdue,
      streak: 0,
    };
  });

  const items = [
    { label: 'Today', value: stats?.total ?? 0, icon: ListTodo, tone: 'text-foreground' },
    { label: 'Done', value: stats?.done ?? 0, icon: Target, tone: 'text-success' },
    { label: 'Overdue', value: stats?.overdue ?? 0, icon: Flame, tone: 'text-priority-urgent' },
  ];

  return (
    <div className="flex items-center divide-x divide-border">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div key={it.label} className="flex items-center gap-2 px-3 first:pl-0 last:pr-0">
            <Icon className={`size-3.5 ${it.tone}`} aria-hidden />
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-sm font-semibold tabular-nums">{it.value}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
                {it.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
