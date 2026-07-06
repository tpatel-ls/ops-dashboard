'use client';

import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowRight,
  Brain,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Flame,
  FolderKanban,
  Inbox,
  NotebookPen,
  PhoneCall,
  Plus,
  Radar,
  ShieldCheck,
  Smartphone,
  Target,
  Utensils,
} from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import type { Task } from '@ops-dashboard/core';
import { cn } from '@ops-dashboard/ui';
import { ViewShell } from '@/components/view-shell';
import { useAppStore } from '@/lib/app-store';
import {
  summarizeLifeManagement,
  type AttentionItem,
  type ManagementModule,
  type ManagementTone,
} from '@/lib/life-management';

const TONE_CLASS: Record<ManagementTone, string> = {
  success: 'border-success/35 bg-success/10 text-success',
  warning: 'border-warning/40 bg-warning/10 text-warning',
  danger: 'border-destructive/35 bg-destructive/10 text-destructive',
  primary: 'border-primary/35 bg-primary/10 text-primary',
  muted: 'border-border bg-bg-sunken text-muted-foreground',
};

const MODULE_ICON: Record<string, React.ElementType> = {
  tasks: ClipboardList,
  projects: FolderKanban,
  identity: ShieldCheck,
  routines: Flame,
  nutrition: Utensils,
  journal: NotebookPen,
  capture: Inbox,
  domains: Target,
};

const QUICK_LAUNCH = [
  { label: 'Capture', href: '/today?capture=1', icon: Plus, detail: 'task, note, meal, thought' },
  { label: 'Briefing', href: '/today', icon: Radar, detail: 'today and attention' },
  { label: 'Calendar', href: '/calendar', icon: CalendarDays, detail: 'time and schedule' },
  { label: 'Power Dialer', href: '/power-dialer', icon: PhoneCall, detail: 'LSG launch control' },
  { label: 'Devices', href: '/devices', icon: Smartphone, detail: 'phone, tablet, watch' },
  { label: 'Ask', href: '/ask', icon: Brain, detail: 'chat with context' },
];

function scoreLabel(score: number): string {
  if (score >= 85) return 'controlled';
  if (score >= 70) return 'stable';
  if (score >= 50) return 'loaded';
  return 'needs command';
}

function taskSortTime(task: Task): number {
  const raw = task.startAt ?? task.dueAt ?? task.scheduledFor;
  return raw ? new Date(raw).getTime() : Number.MAX_SAFE_INTEGER;
}

export function LifeCommandCenter() {
  const openQuickAdd = useAppStore((state) => state.openQuickAdd);
  const launch = useLiveQuery(async () => {
    const db = getDb();
    const [projects, tasks] = await Promise.all([
      db.projects.toArray().then((all) => all.filter((p) => !p.deletedAt && !p.archivedAt)),
      db.tasks.toArray().then((all) => all.filter((t) => !t.deletedAt && t.status !== 'archived')),
    ]);
    const launchProjects = projects.filter((project) =>
      ['blue text', 'power dialer'].includes(project.name.trim().toLowerCase()),
    );
    const projectIds = new Set(launchProjects.map((project) => project.id));
    const launchTasks = tasks.filter((task) => task.projectId && projectIds.has(task.projectId));
    if (launchProjects.length === 0 && launchTasks.length === 0) return null;
    const open = launchTasks.filter((task) => task.status !== 'done');
    const urgent = open.filter((task) => task.priority >= 3).length;
    const scheduled = open
      .filter((task) => task.scheduledFor || task.startAt || task.dueAt)
      .sort((a, b) => taskSortTime(a) - taskSortTime(b));
    return {
      projects: launchProjects.length,
      open: open.length,
      urgent,
      doing: launchTasks.filter((task) => task.status === 'doing').length,
      next: scheduled[0],
    };
  });
  const summary = useLiveQuery(async () => {
    const db = getDb();
    const [
      tasks,
      projects,
      domains,
      routines,
      routineChecks,
      captures,
      journalEntries,
      foodLogs,
    ] = await Promise.all([
      db.tasks.toArray(),
      db.projects.toArray(),
      db.domains.toArray(),
      db.routines.toArray(),
      db.routineChecks.toArray(),
      db.captures.toArray(),
      db.journalEntries.toArray(),
      db.foodLogs.toArray(),
    ]);

    return summarizeLifeManagement({
      tasks,
      projects,
      domains,
      routines,
      routineChecks,
      captures,
      journalEntries,
      foodLogs,
    });
  });

  return (
    <ViewShell
      eyebrow="All-in-one"
      title="Life Command"
      subtitle="One management surface for tasks, projects, identity, health, notes, captures, devices, and review gaps."
      actions={
        <button
          type="button"
          onClick={openQuickAdd}
          className="hairline inline-flex h-9 items-center gap-2 rounded-[10px] border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Plus className="size-3.5 text-primary" aria-hidden />
          Capture
        </button>
      }
    >
      {!summary ? (
        <DashboardSkeleton />
      ) : (
        <div className="flex flex-col gap-5">
          <section className="surface relative overflow-hidden p-5 md:p-6">
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,color-mix(in_oklch,var(--primary)_24%,transparent),transparent_34%),radial-gradient(circle_at_86%_12%,color-mix(in_oklch,var(--success)_16%,transparent),transparent_36%)]"
            />
            <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="flex flex-col justify-between gap-5">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
                    <Radar className="size-3.5 text-primary" aria-hidden />
                    Management score
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="font-mono text-6xl font-semibold leading-none tabular-nums tracking-tight md:text-7xl">
                      {summary.commandScore}
                    </span>
                    <span className="pb-2 font-mono text-sm text-subtle-foreground">/100</span>
                  </div>
                  <div className="mt-2 inline-flex rounded-full border bg-card/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-primary backdrop-blur">
                    {scoreLabel(summary.commandScore)}
                  </div>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                    The score is built from open work, project freshness, identity progress,
                    routine completion, nutrition logging, journal cadence, capture routing,
                    and domain coverage.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <HeroMetric label="Open" value={summary.openTasks} />
                  <HeroMetric label="Overdue" value={summary.overdue} tone="danger" />
                  <HeroMetric label="Projects" value={summary.activeProjects} />
                  <HeroMetric label="Identity" value={summary.identityScore} suffix="%" />
                </div>
              </div>
              <AttentionPanel items={summary.attention} />
            </div>
          </section>

          {launch ? <LsgLaunchStrip launch={launch} /> : null}

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {summary.modules.map((module) => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="surface p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold tracking-tight">Today’s execution</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The minimum set of signals that keeps the system alive.
                  </p>
                </div>
                <span className="rounded-full border bg-bg-sunken px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle-foreground">
                  {summary.today}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <ExecutionRow
                  label="Tasks due today"
                  value={summary.dueToday}
                  detail={`${summary.overdue} overdue`}
                  href="/tasks"
                  tone={summary.overdue > 0 ? 'danger' : 'primary'}
                />
                <ExecutionRow
                  label="Routines"
                  value={`${summary.routineDone}/${summary.routineTotal}`}
                  detail={`${summary.routinePct}% complete`}
                  href="/routines"
                  tone={summary.routinePct >= 80 ? 'success' : 'primary'}
                />
                <ExecutionRow
                  label="Meals logged"
                  value={summary.mealsLogged}
                  detail="nutrition signal"
                  href="/food"
                  tone={summary.mealsLogged > 0 ? 'success' : 'warning'}
                />
                <ExecutionRow
                  label="Inbox routing"
                  value={summary.pendingCaptures}
                  detail="pending captures"
                  href="/inbox"
                  tone={summary.pendingCaptures > 0 ? 'warning' : 'success'}
                />
              </div>
            </div>

            <div className="surface p-5">
              <div className="mb-4">
                <h2 className="text-base font-semibold tracking-tight">Quick launch</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Jump into the system without hunting through pages.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {QUICK_LAUNCH.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex items-center gap-3 rounded-[12px] border bg-bg-sunken/60 px-3 py-2.5 transition-colors hover:bg-accent"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-card text-primary">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{item.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.detail}
                        </span>
                      </span>
                      <ArrowRight className="size-3.5 text-subtle-foreground transition-colors group-hover:text-foreground" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      )}
    </ViewShell>
  );
}

function HeroMetric({
  label,
  value,
  suffix,
  tone = 'primary',
}: {
  label: string;
  value: number;
  suffix?: string;
  tone?: ManagementTone;
}) {
  return (
    <div className={cn('rounded-[14px] border bg-card/72 p-3 backdrop-blur', TONE_CLASS[tone])}>
      <div className="font-mono text-2xl font-semibold tabular-nums text-foreground">
        {value}
        {suffix ? <span className="ml-1 text-xs text-muted-foreground">{suffix}</span> : null}
      </div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle-foreground">
        {label}
      </div>
    </div>
  );
}

function LsgLaunchStrip({
  launch,
}: {
  launch: {
    projects: number;
    open: number;
    urgent: number;
    doing: number;
    next?: Task;
  };
}) {
  return (
    <section className="surface relative overflow-hidden p-4 md:p-5">
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_oklch,var(--success)_14%,transparent),transparent_34%),radial-gradient(circle_at_92%_10%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_32%)]"
      />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border bg-card/80 text-primary backdrop-blur">
            <PhoneCall className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
              LSG launch
            </div>
            <h2 className="truncate text-lg font-semibold tracking-tight">
              Power Dialer and Blue Text are now live workstreams.
            </h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {launch.next ? `Next scheduled: ${launch.next.title}` : 'Sync the launch plan to schedule the next moves.'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 lg:w-[420px]">
          <MiniLaunchStat label="Projects" value={launch.projects} />
          <MiniLaunchStat label="Open" value={launch.open} />
          <MiniLaunchStat label="Doing" value={launch.doing} />
          <MiniLaunchStat label="Urgent" value={launch.urgent} />
        </div>
        <Link
          href="/power-dialer"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Open dialer
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

function MiniLaunchStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[12px] border bg-card/75 px-2 py-2 text-center backdrop-blur">
      <div className="font-mono text-lg font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-subtle-foreground">
        {label}
      </div>
    </div>
  );
}

function AttentionPanel({ items }: { items: AttentionItem[] }) {
  return (
    <div className="rounded-[18px] border bg-card/72 p-4 backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Attention queue</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Work the top item first.</p>
        </div>
        <span className="rounded-full border bg-bg-sunken px-2 py-1 font-mono text-[10px] tabular-nums text-subtle-foreground">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="flex min-h-[168px] flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed bg-bg-sunken/60 p-6 text-center">
          <CheckCircle2 className="size-5 text-success" aria-hidden />
          <p className="text-sm font-medium">No management gaps.</p>
          <p className="text-xs leading-5 text-muted-foreground">
            Capture what appears next, then keep executing.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex items-center gap-3 rounded-[12px] border bg-bg-sunken/60 px-3 py-2.5 transition-colors hover:bg-accent"
              >
                <span className={cn('size-2 rounded-full', TONE_CLASS[item.tone])} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>
                </span>
                <ArrowRight className="size-3.5 text-subtle-foreground transition-colors group-hover:text-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ModuleCard({ module }: { module: ManagementModule }) {
  const Icon = MODULE_ICON[module.id] ?? Target;
  return (
    <Link
      href={module.href}
      className="surface group flex min-h-[154px] flex-col justify-between p-4 transition-all hover:-translate-y-0.5 hover:border-border-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn('flex size-10 items-center justify-center rounded-[13px] border', TONE_CLASS[module.tone])}>
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="font-mono text-[10px] tabular-nums text-subtle-foreground">
          {module.score}%
        </span>
      </div>
      <div>
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-bg-sunken">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${module.score}%` }}
          />
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight">{module.label}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{module.detail}</p>
          </div>
          <span className="shrink-0 font-mono text-lg font-semibold tabular-nums">
            {module.value}
          </span>
        </div>
      </div>
    </Link>
  );
}

function ExecutionRow({
  label,
  value,
  detail,
  href,
  tone,
}: {
  label: string;
  value: number | string;
  detail: string;
  href: string;
  tone: ManagementTone;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-[14px] border bg-bg-sunken/60 p-3 transition-colors hover:bg-accent"
    >
      <span className={cn('flex size-9 items-center justify-center rounded-[12px] border font-mono text-sm font-semibold tabular-nums', TONE_CLASS[tone])}>
        {value}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
      <ArrowRight className="size-3.5 text-subtle-foreground transition-colors group-hover:text-foreground" />
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="surface h-72 animate-pulse" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="surface h-40 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
