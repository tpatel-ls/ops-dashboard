'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { getDb } from '@ops-dashboard/core';

const SLIP_DAYS = 5;

export function SlippingProjects() {
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
        <AlertTriangle className="size-3.5 text-warning" aria-hidden />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
          Slipping
        </span>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {projects.map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
            <span
              className="size-2.5 shrink-0 rounded-[3px] ring-1 ring-inset ring-black/5"
              style={{ background: p.color ?? 'var(--color-muted-foreground)' }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] leading-5">{p.name}</div>
              <div className="font-mono text-[10px] text-muted-foreground">
                {p.lastWorkedAt
                  ? `last worked ${formatDistanceToNow(parseISO(p.lastWorkedAt), { addSuffix: true })}`
                  : 'never worked on'}
              </div>
            </div>
            <span className="shrink-0 rounded bg-warning/15 px-1.5 py-0.5 font-mono text-[10px] text-warning">
              {p.kind}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
