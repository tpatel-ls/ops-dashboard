'use client';

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb, matchesOrgContext, PERSONAL_COLOR } from '@ops-dashboard/core';
import type { Project, Task } from '@ops-dashboard/core';
import { cn } from '@ops-dashboard/ui';
import { taskLane } from '@/lib/org-lanes';
import { useOrgStore } from '@/lib/org-store';

export interface OrgLane {
  /** orgId, or 'personal' for the no-org lane. */
  id: string;
  label: string;
  color: string;
}

/**
 * Lane state for calendar-style views: which lanes exist, the active context,
 * per-lane show/hide (only meaningful under the All lens), and helpers to
 * resolve a task's lane + color. Hidden lanes are per-view UI state.
 */
export function useOrgLanes(projectsMap?: Pick<Map<string, Project>, 'get'>) {
  const ctx = useOrgStore((s) => s.ctx);
  const orgs = useLiveQuery(async () => {
    const all = await getDb().organizations.toArray();
    return all
      .filter((o) => !o.deletedAt)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  });
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());

  const lanes: OrgLane[] = useMemo(
    () => [
      ...(orgs ?? []).map((o) => ({ id: o.id, label: o.name, color: o.color })),
      { id: 'personal', label: 'Personal', color: PERSONAL_COLOR },
    ],
    [orgs],
  );

  const colors = useMemo(() => new Map(lanes.map((l) => [l.id, l.color])), [lanes]);

  const laneOf = (task: Pick<Task, 'orgId' | 'projectId'>): string => {
    const orgId = projectsMap ? taskLane(task, projectsMap) : task.orgId;
    return orgId ?? 'personal';
  };

  const colorOf = (laneId: string): string => colors.get(laneId) ?? PERSONAL_COLOR;

  const visible = (task: Pick<Task, 'orgId' | 'projectId'>): boolean => {
    const lane = laneOf(task);
    if (!matchesOrgContext(lane === 'personal' ? undefined : lane, ctx)) return false;
    return !(ctx === 'all' && hidden.has(lane));
  };

  const toggle = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // The legend only earns its place when overlaying more than one lane.
  const showLegend = ctx === 'all' && lanes.length > 1;

  return { ctx, lanes, hidden, toggle, laneOf, colorOf, visible, showLegend };
}

/** Color-keyed lane chips; click toggles a lane on/off (All lens only). */
export function OrgLaneLegend({
  lanes,
  hidden,
  onToggle,
}: {
  lanes: OrgLane[];
  hidden: ReadonlySet<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {lanes.map((lane) => {
        const off = hidden.has(lane.id);
        return (
          <button
            key={lane.id}
            type="button"
            onClick={() => onToggle(lane.id)}
            aria-pressed={!off}
            title={off ? `Show ${lane.label}` : `Hide ${lane.label}`}
            className={cn(
              'hairline inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all',
              off
                ? 'bg-bg-sunken text-subtle-foreground opacity-60'
                : 'bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            <span
              aria-hidden
              className="size-2 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]"
              style={{ background: off ? 'var(--border-strong)' : lane.color }}
            />
            <span className="max-w-28 truncate">{lane.label}</span>
          </button>
        );
      })}
    </div>
  );
}
