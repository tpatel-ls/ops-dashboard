'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, Plus } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { getDb } from '@ops-dashboard/core';
import { useAppStore } from '@/lib/app-store';

const SLIP_DAYS = 5;

export function SlippingProjects() {
  const openWorkLogger = useAppStore((state) => state.openWorkLogger);
  const projects = useLiveQuery(async () => {
    const all = await getDb().projects.toArray();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - SLIP_DAYS);

    return all.filter((p) => {
      if (p.deletedAt || p.archivedAt) return false;
      if (p.kind !== 'project' && p.kind !== 'retainer') return false;
      if (p.status !== 'active') return false;
      if (!p.lastWorkedAt) return true;
      return parseISO(p.lastWorkedAt) < threshold;
    });
  });

  if (!projects || projects.length === 0) return null;

  return (
    <section className="surface-flat">
      <div className="hairline flex items-center gap-1.5 border-b px-4 py-2.5">
        <AlertTriangle className="text-warning size-3.5" aria-hidden />
        <span className="text-subtle-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
          Needs attention
        </span>
      </div>
      <ul className="divide-border flex flex-col divide-y">
        {projects.map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
            <span
              className="size-2.5 shrink-0 rounded-[3px] ring-1 ring-black/5 ring-inset"
              style={{ background: p.color ?? 'var(--color-muted-foreground)' }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] leading-5">{p.name}</div>
              <div className="text-muted-foreground font-mono text-[10px]">
                {p.lastWorkedAt
                  ? `last worked ${formatDistanceToNow(parseISO(p.lastWorkedAt), { addSuffix: true })}`
                  : 'never worked on'}
              </div>
            </div>
            <span className="bg-warning/15 text-warning shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]">
              {p.kind}
            </span>
            <button
              type="button"
              onClick={() => openWorkLogger('task', p.id)}
              className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-md transition-colors"
              aria-label={`Add task to ${p.name}`}
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
