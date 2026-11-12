'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, Plus } from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import { useAppStore } from '@/lib/app-store';
import { projectIsSlipping } from '@/lib/project-query';
import { projectBoardKind } from '@/lib/projects';
import { relativeTimeLabel } from '@/lib/relative-time';
import { useLiveSettings } from '@/lib/use-settings';
import { useToday } from '@/lib/use-today';

export function SlippingProjects() {
  const openWorkLogger = useAppStore((state) => state.openWorkLogger);
  // The setting is described as deciding when a project counts as slipping,
  // and the projects board and portfolio dashboard already read it. This rail
  // kept its own constant, which happened to equal the default, so widening
  // the setting left the rail flagging projects the rest of the app did not.
  const slippingDays = useLiveSettings().slippingDays;
  // Listed in the deps so the rail re-checks each day. Without it the query
  // ran again only on a database change, so a project that went quiet stayed
  // off the rail on a page left open.
  const today = useToday();
  const projects = useLiveQuery(async () => {
    const all = await getDb().projects.toArray();
    const now = new Date();

    return all.filter((p) => {
      if (p.deletedAt || p.archivedAt) return false;
      // Read the kind the way the projects board files it. A synced row with a
      // missing or unknown kind shows on the board as a project, but an exact
      // match here kept it off this rail however long it went quiet.
      const kind = projectBoardKind(p.kind);
      if (kind !== 'project' && kind !== 'retainer') return false;
      if (p.status !== 'active') return false;
      return projectIsSlipping(p.lastWorkedAt, slippingDays, now);
    });
  }, [slippingDays, today]);

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
