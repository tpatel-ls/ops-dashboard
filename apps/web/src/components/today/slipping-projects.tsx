'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, Plus } from 'lucide-react';
import { isValid, parseISO } from 'date-fns';
import { getDb } from '@ops-dashboard/core';
import { useAppStore } from '@/lib/app-store';
import { relativeTimeLabel } from '@/lib/relative-time';
import { useLiveSettings } from '@/lib/use-settings';

export function SlippingProjects() {
  const openWorkLogger = useAppStore((state) => state.openWorkLogger);
  // The setting is described as deciding when a project counts as slipping,
  // and the projects board and portfolio dashboard already read it. This rail
  // kept its own constant, which happened to equal the default, so widening
  // the setting left the rail flagging projects the rest of the app did not.
  const slippingDays = useLiveSettings().slippingDays;
  const projects = useLiveQuery(async () => {
    const all = await getDb().projects.toArray();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - slippingDays);

    return all.filter((p) => {
      if (p.deletedAt || p.archivedAt) return false;
      if (p.kind !== 'project' && p.kind !== 'retainer') return false;
      if (p.status !== 'active') return false;
      if (!p.lastWorkedAt) return true;
      // An unparseable timestamp is no evidence of recent work. Comparing an
      // Invalid Date is always false, which used to hide the project here.
      const lastWorkedAt = parseISO(p.lastWorkedAt);
      if (!isValid(lastWorkedAt)) return true;
      return lastWorkedAt < threshold;
    });
  }, [slippingDays]);

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
        {projects.map((p) => {
          const lastWorked = relativeTimeLabel(p.lastWorkedAt);
          return (
            <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className="size-2.5 shrink-0 rounded-[3px] ring-1 ring-black/5 ring-inset"
                style={{ background: p.color ?? 'var(--color-muted-foreground)' }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] leading-5">{p.name}</div>
                <div className="text-muted-foreground font-mono text-[10px]">
                  {lastWorked ? `last worked ${lastWorked}` : 'never worked on'}
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
          );
        })}
      </ul>
    </section>
  );
}
