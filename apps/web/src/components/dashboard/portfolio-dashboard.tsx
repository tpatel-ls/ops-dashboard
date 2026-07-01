'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState, useTransition } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
  FolderKanban,
  FolderPlus,
  ListTodo,
  Sparkles,
} from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { getDb } from '@ops-dashboard/core';
import type { Domain, Project, ProjectStatus, Task, TaskStatus } from '@ops-dashboard/core';
import { cn } from '@ops-dashboard/ui';
import { ViewShell } from '@/components/view-shell';
import { ProjectDetail } from '@/components/project-detail';
import {
  PORTFOLIO_PROJECT_NAMES,
  importPortfolioProjects,
} from '@/lib/import-projects';

// ─── Constants ──────────────────────────────────────────────────────────────────

const SLIPPING_DAYS = 5;

const STATUS_RANK: Record<Project['status'], number> = {
  active: 0,
  paused: 1,
  done: 2,
  archived: 3,
};

const STATUS_LABELS: Record<Project['status'], string> = {
  active: 'Active',
  paused: 'Paused',
  done: 'Done',
  archived: 'Archived',
};

const STATUS_CLASSES: Record<Project['status'], string> = {
  active: 'text-success',
  paused: 'text-warning',
  done: 'text-muted-foreground',
  archived: 'text-subtle-foreground',
};

const SEGMENTS: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'done', label: 'Done', color: 'var(--success)' },
  { key: 'doing', label: 'In progress', color: 'var(--warning)' },
  { key: 'todo', label: 'To do', color: 'var(--primary)' },
  { key: 'backlog', label: 'Backlog', color: 'var(--subtle-foreground)' },
  { key: 'blocked', label: 'Blocked', color: 'var(--destructive)' },
];

function emptyCounts(): Record<TaskStatus, number> {
  return { backlog: 0, todo: 0, doing: 0, blocked: 0, done: 0, archived: 0 };
}

// ─── Derived per-project shape ────────────────────────────────────────────────────

type SortKey = 'default' | 'progress' | 'open' | 'name';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'default', label: 'Default' },
  { key: 'progress', label: 'Progress' },
  { key: 'open', label: 'Open' },
  { key: 'name', label: 'Name' },
];

const STATUS_FILTERS: { key: 'all' | ProjectStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'paused', label: 'Paused' },
  { key: 'done', label: 'Done' },
];

interface ProjectStats {
  project: Project;
  domain?: Domain;
  total: number;
  done: number;
  pct: number;
  counts: Record<TaskStatus, number>;
  open: number;
  urgent: number;
  next?: Task;
  hours: number;
  isSlipping: boolean;
}

// ─── Small pieces ─────────────────────────────────────────────────────────────────

function ProgressRing({ pct, color, size = 52, stroke = 5 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - clamped / 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          style={{ stroke: 'var(--bg-sunken)' }}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
          style={{ stroke: color }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-medium text-foreground tabular-nums">
        {clamped}
        <span className="ml-px text-subtle-foreground">%</span>
      </span>
    </div>
  );
}

function StatusBar({ counts, total }: { counts: Record<TaskStatus, number>; total: number }) {
  if (total === 0) {
    return <div className="h-2 w-full rounded-full bg-bg-sunken" />;
  }
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-bg-sunken">
      {SEGMENTS.map((s) => {
        const n = counts[s.key];
        if (!n) return null;
        return (
          <div
            key={s.key}
            className="h-full"
            style={{ width: `${(n / total) * 100}%`, background: s.color }}
            title={`${s.label}: ${n}`}
          />
        );
      })}
    </div>
  );
}

function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
      {SEGMENTS.map((s) => (
        <span
          key={s.key}
          className="inline-flex items-center gap-1.5 text-[11px] text-subtle-foreground"
        >
          <span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden />
          {s.label}
        </span>
      ))}
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: typeof FolderKanban;
  color: string;
}) {
  return (
    <div className="surface flex items-center gap-3 px-4 py-3">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
        style={{ background: `color-mix(in oklch, ${color} 15%, transparent)` }}
      >
        <Icon className="size-4" style={{ color }} aria-hidden />
      </div>
      <div className="min-w-0">
        <div className="text-[22px] font-semibold leading-none tabular-nums">{value}</div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-subtle-foreground">
          {label}
        </div>
      </div>
    </div>
  );
}

function PriorityDot({ priority }: { priority: number }) {
  const tone =
    priority >= 3 ? 'var(--destructive)' : priority === 2 ? 'var(--warning)' : priority === 1 ? 'var(--primary)' : 'var(--subtle-foreground)';
  return <span className="size-1.5 shrink-0 rounded-full" style={{ background: tone }} aria-hidden />;
}

// ─── Segmented control ────────────────────────────────────────────────────────────

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="hairline inline-flex items-center gap-0.5 rounded-[10px] border bg-card p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          aria-pressed={value === o.key}
          className={cn(
            'rounded-[7px] px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            value === o.key
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Project tile ─────────────────────────────────────────────────────────────────

function ProjectTile({ stats, onClick }: { stats: ProjectStats; onClick: () => void }) {
  const { project, domain, total, done, pct, counts, open, urgent, next, hours, isSlipping } = stats;
  return (
    <button
      type="button"
      onClick={onClick}
      className="surface group flex w-full flex-col gap-3 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_10px_30px_-16px_rgba(0,0,0,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="size-3 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
              style={{ background: project.color }}
              aria-hidden
            />
            <span className="truncate text-[15px] font-semibold tracking-tight">{project.name}</span>
            <span
              className={cn(
                'font-mono text-[10px] uppercase tracking-[0.14em]',
                STATUS_CLASSES[project.status],
              )}
            >
              {STATUS_LABELS[project.status]}
            </span>
          </div>
          {domain ? (
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-bg-sunken px-2 py-0.5">
              <span className="size-1.5 rounded-full" style={{ background: domain.color }} aria-hidden />
              <span className="font-mono text-[10px] text-subtle-foreground">{domain.name}</span>
            </div>
          ) : null}
          {project.description ? (
            <p className="mt-1.5 line-clamp-1 text-xs text-muted-foreground">{project.description}</p>
          ) : null}
        </div>
        <ProgressRing pct={pct} color={project.color} />
      </div>

      {/* Distribution */}
      <StatusBar counts={counts} total={total} />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-subtle-foreground">
        <span className="tabular-nums">
          {done}/{total} done
        </span>
        {counts.doing > 0 ? (
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full" style={{ background: 'var(--warning)' }} aria-hidden />
            {counts.doing} in progress
          </span>
        ) : null}
        {counts.blocked > 0 ? (
          <span className="inline-flex items-center gap-1 text-destructive">
            <span className="size-1.5 rounded-full" style={{ background: 'var(--destructive)' }} aria-hidden />
            {counts.blocked} blocked
          </span>
        ) : null}
      </div>

      {/* Next action */}
      <div className="hairline flex items-center gap-2 border-t pt-3 text-xs">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle-foreground">Next</span>
        {next ? (
          <>
            <PriorityDot priority={next.priority} />
            <span className="truncate text-foreground">{next.title}</span>
          </>
        ) : (
          <span className="text-muted-foreground">All clear</span>
        )}
        <ArrowRight className="ml-auto size-3.5 shrink-0 text-subtle-foreground transition-colors group-hover:text-foreground" aria-hidden />
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-subtle-foreground">
        <span>{open} open</span>
        {urgent > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] text-destructive">
            <Flame className="size-3" aria-hidden />
            {urgent} urgent
          </span>
        ) : null}
        {hours > 0 ? (
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" aria-hidden />
            {hours.toFixed(1)}h logged
          </span>
        ) : null}
        {isSlipping && project.status === 'active' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] text-warning">
            <AlertTriangle className="size-3" aria-hidden />
            Slipping
          </span>
        ) : null}
      </div>
    </button>
  );
}

// ─── Next-actions rail ────────────────────────────────────────────────────────────

function NextActionsRail({ stats, onPick }: { stats: ProjectStats[]; onPick: (p: Project) => void }) {
  const actionable = stats.filter((s) => s.next && s.project.status === 'active');
  return (
    <div className="surface flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-3.5 text-primary" aria-hidden />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
          Next actions
        </span>
      </div>
      {actionable.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing queued. Add a task to a project to see it here.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {actionable.map((s) => (
            <li key={s.project.id}>
              <button
                type="button"
                onClick={() => onPick(s.project)}
                className="group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <span
                  className="mt-1 size-2 shrink-0 rounded-full"
                  style={{ background: s.project.color }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-foreground">{s.next!.title}</span>
                  <span className="block truncate font-mono text-[10px] text-subtle-foreground">
                    {s.project.name}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────────

export function PortfolioDashboard() {
  const [selected, setSelected] = useState<Project | null>(null);
  const [importing, startImport] = useTransition();
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');

  const data = useLiveQuery(async () => {
    const db = getDb();
    const [projects, domains, tasks, workLogs] = await Promise.all([
      db.projects.toArray().then((all) => all.filter((p) => !p.deletedAt && !p.archivedAt)),
      db.domains.toArray().then((all) => all.filter((d) => !d.deletedAt)),
      db.tasks.toArray().then((all) => all.filter((t) => !t.deletedAt && t.status !== 'archived')),
      db.workLogs.toArray().then((all) => all.filter((w) => !w.deletedAt)),
    ]);

    const domainMap = new Map(domains.map((d) => [d.id, d]));
    const hoursByProject = new Map<string, number>();
    for (const w of workLogs) {
      hoursByProject.set(w.projectId, (hoursByProject.get(w.projectId) ?? 0) + w.minutes);
    }

    const stats: ProjectStats[] = projects.map((project) => {
      const pTasks = tasks.filter((t) => t.projectId === project.id);
      const counts = emptyCounts();
      for (const t of pTasks) counts[t.status] += 1;
      const total = pTasks.length;
      const done = counts.done;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      const openTasks = pTasks
        .filter((t) => t.status !== 'done')
        .sort((a, b) => b.priority - a.priority || a.order - b.order);
      const lastWorked = project.lastWorkedAt ? parseISO(project.lastWorkedAt) : null;
      // Slipping = had activity before but has gone stale. A never-worked project
      // is "not started", not slipping, so it does not get the warning badge.
      const isSlipping = lastWorked !== null && differenceInDays(new Date(), lastWorked) > SLIPPING_DAYS;
      return {
        project,
        domain: project.domainId ? domainMap.get(project.domainId) : undefined,
        total,
        done,
        pct,
        counts,
        open: openTasks.length,
        urgent: openTasks.filter((t) => t.priority >= 3).length,
        next: openTasks[0],
        hours: (hoursByProject.get(project.id) ?? 0) / 60,
        isSlipping,
      };
    });

    stats.sort(
      (a, b) =>
        STATUS_RANK[a.project.status] - STATUS_RANK[b.project.status] ||
        b.open - a.open ||
        a.project.name.localeCompare(b.project.name),
    );

    const presentNames = new Set(projects.map((p) => p.name.trim().toLowerCase()));
    const missing = PORTFOLIO_PROJECT_NAMES.filter((n) => !presentNames.has(n.trim().toLowerCase()));

    const totals = {
      activeProjects: stats.filter((s) => s.project.status === 'active').length,
      openTasks: stats.reduce((n, s) => n + s.open, 0),
      inProgress: stats.reduce((n, s) => n + s.counts.doing, 0),
      done: stats.reduce((n, s) => n + s.counts.done, 0),
      totalTasks: stats.reduce((n, s) => n + s.total, 0),
    };

    return { stats, totals, missing, domains };
  });

  const visibleStats = useMemo(() => {
    let list = data?.stats ?? [];
    if (statusFilter !== 'all') list = list.filter((s) => s.project.status === statusFilter);
    if (sortKey === 'default') return list;
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortKey === 'progress') return b.pct - a.pct;
      if (sortKey === 'open') return b.open - a.open;
      return a.project.name.localeCompare(b.project.name);
    });
    return sorted;
  }, [data, sortKey, statusFilter]);

  // Keep the open detail drawer in sync with edits made inside it.
  const liveSelected = useLiveQuery(
    async () => (selected ? ((await getDb().projects.get(selected.id)) ?? null) : null),
    [selected?.id],
  );
  const displayProject = liveSelected !== undefined ? liveSelected : selected;

  function handleImport() {
    startImport(async () => {
      await importPortfolioProjects();
    });
  }

  const missing = data?.missing ?? [];
  const overallPct =
    data && data.totals.totalTasks > 0
      ? Math.round((data.totals.done / data.totals.totalTasks) * 100)
      : 0;
  const importButton =
    missing.length > 0 ? (
      <button
        type="button"
        onClick={handleImport}
        disabled={importing}
        className="hairline inline-flex h-9 items-center gap-2 rounded-[10px] border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60"
      >
        <FolderPlus className="size-3.5 text-primary" aria-hidden />
        {importing ? 'Loading…' : 'Load my projects'}
      </button>
    ) : null;

  return (
    <>
      <ViewShell
        eyebrow="Overview"
        title="Dashboard"
        subtitle="Everything you are tracking, in one place."
        meta={
          data && data.totals.totalTasks > 0 ? (
            <div className="hidden items-center gap-2 sm:flex">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-bg-sunken">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {overallPct}% done
              </span>
            </div>
          ) : null
        }
        actions={importButton}
        rail={data ? <NextActionsRail stats={data.stats} onPick={setSelected} /> : null}
      >
        <div className="flex flex-col gap-5">
          {/* Stat tiles */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Active" value={data?.totals.activeProjects ?? 0} icon={FolderKanban} color="var(--primary)" />
            <StatTile label="Open tasks" value={data?.totals.openTasks ?? 0} icon={ListTodo} color="var(--foreground)" />
            <StatTile label="In progress" value={data?.totals.inProgress ?? 0} icon={Activity} color="var(--warning)" />
            <StatTile label="Done" value={data?.totals.done ?? 0} icon={CheckCircle2} color="var(--success)" />
          </div>

          {/* Toolbar */}
          {data && data.stats.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Segmented options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
              <Segmented options={SORTS} value={sortKey} onChange={setSortKey} />
            </div>
          ) : null}

          {/* Project grid */}
          {data === undefined ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  aria-hidden
                  className="surface h-44 animate-pulse"
                  style={{ animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
          ) : data.stats.length === 0 ? (
            <div className="surface flex h-64 flex-col items-center justify-center gap-3 text-center">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-subtle-foreground">
                dashboard
              </div>
              <h3 className="text-xl font-semibold tracking-tight">Load your projects.</h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                Bring Blue Text, Power Dialer, Mini Monet, and Email Triage into the board with their tasks.
              </p>
              <button
                type="button"
                onClick={handleImport}
                disabled={importing}
                className="inline-flex items-center gap-2 rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <FolderPlus className="size-4" aria-hidden />
                {importing ? 'Loading…' : 'Load my projects'}
              </button>
            </div>
          ) : visibleStats.length === 0 ? (
            <div className="surface flex h-40 flex-col items-center justify-center gap-1 text-center">
              <p className="text-sm text-muted-foreground">No projects match this filter.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleStats.map((s) => (
                <ProjectTile key={s.project.id} stats={s} onClick={() => setSelected(s.project)} />
              ))}
            </div>
          )}

          {data && data.stats.length > 0 ? <StatusLegend /> : null}
        </div>
      </ViewShell>

      {displayProject ? (
        <ProjectDetail
          project={displayProject}
          domains={data?.domains ?? []}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  );
}
