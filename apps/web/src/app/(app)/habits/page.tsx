'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, CheckCircle2, Flame, Sparkles } from 'lucide-react';
import { getDb } from '@drift/core';
import { ViewShell } from '@/components/view-shell';
import { ActivityHeatmap } from '@/components/activity-heatmap';
import { loadActivity } from '@/lib/activity';
import { computeStreak, todayISO, addDaysISO } from '@/lib/routines';
import { cn } from '@drift/ui';

// ─── Stat card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  tone?: string;
  sub?: string;
}

function StatCard({ label, value, icon: Icon, tone = 'text-primary', sub }: StatCardProps) {
  return (
    <div className="surface flex items-center gap-4 px-5 py-4">
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft',
          tone,
        )}
      >
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
          {label}
        </div>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="font-mono text-xl font-semibold tabular-nums leading-none">
            {value}
          </span>
          {sub ? (
            <span className="text-xs text-muted-foreground">{sub}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HabitsPage() {
  const data = useLiveQuery(async () => {
    return loadActivity(365);
  });

  const stats = useLiveQuery(async () => {
    const db = getDb();
    const today = todayISO();

    // Best streak across all active routines
    const routines = await db.routines.filter((r) => !r.deletedAt && !r.archivedAt).toArray();
    const allChecks = await db.routineChecks
      .filter((c) => !c.deletedAt)
      .toArray();

    let bestStreak = 0;
    for (const routine of routines) {
      const checks = allChecks.filter((c) => c.routineId === routine.id);
      const streak = computeStreak(checks, today);
      if (streak > bestStreak) bestStreak = streak;
    }

    // Journal entries this week (Mon–today)
    const weekStart = (() => {
      const d = new Date();
      const day = d.getDay(); // 0=Sun
      const offset = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + offset);
      return d.toISOString().slice(0, 10);
    })();

    const journalEntries = await db.journalEntries
      .filter((j) => !j.deletedAt && j.date >= weekStart && j.date <= today)
      .toArray();

    // Tasks completed this week
    const weekStartISO = new Date(`${weekStart}T00:00:00`).toISOString();
    const todayEndISO = new Date(`${today}T23:59:59`).toISOString();
    const completedTasks = await db.tasks
      .filter(
        (t) =>
          !t.deletedAt &&
          t.status === 'done' &&
          !!t.completedAt &&
          t.completedAt >= weekStartISO &&
          t.completedAt <= todayEndISO,
      )
      .toArray();

    // Total activity points (sum of all counts)
    const totalCount = (data ?? []).reduce((sum, d) => sum + d.count, 0);

    return {
      bestStreak,
      journalCount: journalEntries.length,
      completedCount: completedTasks.length,
      totalPoints: Math.round(totalCount),
    };
  }, [data]);

  const hasActivity = (data ?? []).some((d) => d.count > 0);

  return (
    <ViewShell
      eyebrow="Build"
      title="Habits"
      subtitle="Your activity across everything, GitHub-style."
    >
      <div className="flex flex-col gap-5">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Current streak"
            value={stats?.bestStreak ?? 0}
            icon={Flame}
            tone="text-primary"
            sub={stats?.bestStreak === 1 ? 'day' : 'days'}
          />
          <StatCard
            label="Tasks done"
            value={stats?.completedCount ?? 0}
            icon={CheckCircle2}
            tone="text-success"
            sub="this week"
          />
          <StatCard
            label="Journal entries"
            value={stats?.journalCount ?? 0}
            icon={BookOpen}
            tone="text-priority-med"
            sub="this week"
          />
          <StatCard
            label="Activity pts"
            value={stats?.totalPoints ?? 0}
            icon={Sparkles}
            tone="text-warning"
            sub="last year"
          />
        </div>

        {/* Heatmap */}
        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
            Activity · Last 365 days
          </div>
          {data === undefined ? (
            <div className="surface flex h-40 animate-pulse items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : !hasActivity ? (
            <div className="surface flex h-40 flex-col items-center justify-center gap-2 text-center">
              <span className="text-2xl" aria-hidden>
                🌱
              </span>
              <p className="text-sm font-medium text-foreground">A clean slate.</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Complete tasks, check off routines, or write a journal entry — every action
                lights up the grid.
              </p>
            </div>
          ) : (
            <ActivityHeatmap data={data} />
          )}
        </div>

        {/* Legend */}
        {hasActivity && (
          <div className="flex items-center gap-2 text-[11px] text-subtle-foreground">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((lvl) => (
              <span
                key={lvl}
                className={cn(
                  'inline-block size-3 rounded-[3px]',
                  lvl === 0 && 'bg-bg-sunken',
                  lvl === 1 && 'bg-primary-soft',
                  lvl === 2 && 'bg-primary/30',
                  lvl === 3 && 'bg-primary/65',
                  lvl === 4 && 'bg-primary',
                )}
                aria-label={`Level ${lvl}`}
              />
            ))}
            <span>More</span>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em]">
              task ×1 · routine ×2 · journal ×3 · work ×0.5/30 min
            </span>
          </div>
        )}
      </div>
    </ViewShell>
  );
}
