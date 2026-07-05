'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, CheckCircle2, Flame, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import { ViewShell } from '@/components/view-shell';
import { ActivityHeatmap } from '@/components/activity-heatmap';
import { loadActivity } from '@/lib/activity';
import { computeStreak, todayISO } from '@/lib/routines';
import { cn } from '@ops-dashboard/ui';

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

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="font-mono text-[10px] tabular-nums text-subtle-foreground">
          {value}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg-sunken">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${value}%` }}
        />
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

  const activity = data ?? [];
  const hasActivity = activity.some((d) => d.count > 0);
  const activeDays = activity.filter((d) => d.count > 0).length;
  const weeklyActiveDays = activity.slice(-7).filter((d) => d.count > 0).length;
  const bestStreak = stats?.bestStreak ?? 0;
  const completedCount = stats?.completedCount ?? 0;
  const journalCount = stats?.journalCount ?? 0;
  const totalPoints = stats?.totalPoints ?? 0;
  const identityScore = clampScore(
    Math.round(bestStreak * 3.5 + weeklyActiveDays * 7 + Math.min(totalPoints, 160) * 0.22),
  );
  const sectionScores = [
    { label: 'Consistency', value: clampScore(Math.round((bestStreak / 31) * 100)) },
    { label: 'Execution', value: clampScore(Math.round((completedCount / 14) * 100)) },
    { label: 'Reflection', value: clampScore(Math.round((journalCount / 7) * 100)) },
    { label: 'Year signal', value: clampScore(Math.round((activeDays / 365) * 100)) },
  ];

  return (
    <ViewShell
      eyebrow="Build"
      title="Identity Calendar"
      subtitle="Track the daily actions that prove who you are becoming."
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="surface relative overflow-hidden p-5">
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,color-mix(in_oklch,var(--primary)_24%,transparent),transparent_32%),radial-gradient(circle_at_88%_0%,color-mix(in_oklch,var(--success)_15%,transparent),transparent_34%)]"
            />
            <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
                  <ShieldCheck className="size-3.5 text-primary" aria-hidden />
                  Identity score
                </div>
                <div className="flex items-end gap-2">
                  <span className="font-mono text-6xl font-semibold leading-none tabular-nums tracking-tight md:text-7xl">
                    {identityScore}
                  </span>
                  <span className="pb-2 font-mono text-sm text-subtle-foreground">/100</span>
                </div>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                  Built from streak, weekly consistency, completed tasks, reflection, and the
                  year-long activity signal.
                </p>
              </div>
              <div className="grid min-w-[220px] grid-cols-2 gap-2">
                <div className="rounded-[14px] border bg-card/70 p-3 backdrop-blur">
                  <div className="font-mono text-xl font-semibold tabular-nums">{weeklyActiveDays}/7</div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle-foreground">
                    days this week
                  </div>
                </div>
                <div className="rounded-[14px] border bg-card/70 p-3 backdrop-blur">
                  <div className="font-mono text-xl font-semibold tabular-nums">{activeDays}</div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle-foreground">
                    active days
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="surface p-5">
            <div className="mb-4 flex items-center gap-2">
              <Target className="size-4 text-primary" aria-hidden />
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Identity sections</h2>
                <p className="text-xs text-muted-foreground">Each score is normalized to a weekly or monthly target.</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {sectionScores.map((score) => (
                <ScoreBar key={score.label} label={score.label} value={score.value} />
              ))}
            </div>
          </section>
        </div>

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
