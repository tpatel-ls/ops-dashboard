'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import {
  Archive,
  ChevronDown,
  ChevronUp,
  Check,
  Flame,
  Trash2,
} from 'lucide-react';
import { getDb } from '@drift/core';
import type { Domain, Routine, RoutineCheck } from '@drift/core';
import {
  archiveRoutine,
  computeStreak,
  deleteRoutine,
  todayISO,
  toggleRoutineCheck,
} from '@/lib/routines';
import { cn } from '@drift/ui';
import { RoutineForm } from '@/components/routine-form';

/* ─── helpers ─────────────────────────────────────────────────── */

function daysBetween(a: string, b: string): number {
  const msA = new Date(`${a}T00:00:00`).getTime();
  const msB = new Date(`${b}T00:00:00`).getTime();
  return Math.round((msB - msA) / 86_400_000);
}

const TIME_OF_DAY_LABELS: Record<string, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  anytime: 'Anytime',
};

const TIME_OF_DAY_ORDER = ['morning', 'afternoon', 'evening', 'anytime'];

/* ─── RoutineCard ──────────────────────────────────────────────── */

interface RoutineCardProps {
  routine: Routine;
  checks: RoutineCheck[];
  domain: Domain | undefined;
  today: string;
}

function RoutineCard({ routine, checks, domain, today }: RoutineCardProps) {
  const doneToday = checks.some((c) => c.routineId === routine.id && c.date === today && c.done);
  const routineChecks = checks.filter((c) => c.routineId === routine.id);
  const streak = computeStreak(routineChecks, today);

  // Fixed-kind progress
  const isFixed = routine.kind === 'fixed' && routine.durationDays;
  const dayIndex = isFixed ? Math.max(0, daysBetween(routine.startDate, today)) + 1 : null;
  const clampedDay = isFixed ? Math.min(dayIndex!, routine.durationDays!) : null;

  const [confirming, setConfirming] = useState(false);

  async function handleToggle() {
    await toggleRoutineCheck(routine.id, today, !doneToday);
  }

  async function handleArchive() {
    await archiveRoutine(routine.id);
  }

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    await deleteRoutine(routine.id);
  }

  return (
    <li
      className={cn(
        'surface-flat group relative flex items-start gap-3 px-4 py-3 transition-all',
        'hover:border-border-strong hover:shadow-[0_4px_18px_-12px_rgba(0,0,0,0.35)]',
        doneToday && 'opacity-75',
      )}
    >
      {/* Today checkbox */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={doneToday ? 'Mark as not done' : 'Mark as done today'}
        className={cn(
          'mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border transition-all',
          doneToday
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border-strong text-transparent hover:border-primary hover:bg-primary/10',
        )}
      >
        <Check className="size-3" strokeWidth={3} aria-hidden />
      </button>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'text-[14px] font-medium leading-5',
              doneToday && 'text-muted-foreground line-through decoration-muted-foreground/50',
            )}
          >
            {routine.name}
          </span>

          {/* Kind badge */}
          {isFixed ? (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
              day {clampedDay} / {routine.durationDays}
            </span>
          ) : (
            <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-accent-foreground">
              ongoing
            </span>
          )}

          {/* Domain chip */}
          {domain && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] tracking-[0.12em]"
              style={{
                background: domain.color
                  ? `color-mix(in oklch, ${domain.color} 15%, transparent)`
                  : undefined,
                color: domain.color ?? 'inherit',
              }}
            >
              {domain.icon && <span aria-hidden>{domain.icon}</span>}
              {domain.name}
            </span>
          )}
        </div>

        {/* Streak */}
        <div className="mt-1 flex items-center gap-1 font-mono text-[11px] text-subtle-foreground">
          <Flame
            className={cn('size-3', streak > 0 ? 'text-warning' : 'text-subtle-foreground')}
            aria-hidden
          />
          <span>
            {streak > 0 ? `${streak} day streak` : 'No streak yet'}
          </span>
        </div>
      </div>

      {/* Actions (visible on hover) */}
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={handleArchive}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Archive routine"
          title="Archive"
        >
          <Archive className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          onBlur={() => setConfirming(false)}
          className={cn(
            'inline-flex size-7 items-center justify-center rounded-md transition-colors',
            confirming
              ? 'bg-destructive text-destructive-foreground'
              : 'text-muted-foreground hover:text-destructive',
          )}
          aria-label={confirming ? 'Confirm delete' : 'Delete routine'}
          title={confirming ? 'Click again to confirm' : 'Delete'}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}

/* ─── TimeOfDaySection ─────────────────────────────────────────── */

interface TimeOfDaySectionProps {
  label: string;
  routines: Routine[];
  checks: RoutineCheck[];
  domains: Domain[];
  today: string;
}

function TimeOfDaySection({ label, routines, checks, domains, today }: TimeOfDaySectionProps) {
  if (routines.length === 0) return null;

  const domainMap = new Map(domains.map((d) => [d.id, d]));
  const doneCount = routines.filter((r) =>
    checks.some((c) => c.routineId === r.id && c.date === today && c.done),
  ).length;

  return (
    <section className="grid gap-2">
      <div className="flex items-center gap-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
          {label}
        </div>
        <div className="hairline flex-1 border-t" aria-hidden />
        <div className="font-mono text-[10px] tabular-nums text-subtle-foreground">
          {doneCount}/{routines.length}
        </div>
      </div>
      <ul className="grid gap-1.5">
        {routines.map((r) => (
          <RoutineCard
            key={r.id}
            routine={r}
            checks={checks}
            domain={r.domainId ? domainMap.get(r.domainId) : undefined}
            today={today}
          />
        ))}
      </ul>
    </section>
  );
}

/* ─── ArchivedSection ──────────────────────────────────────────── */

interface ArchivedSectionProps {
  routines: Routine[];
}

function ArchivedSection({ routines }: ArchivedSectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (routines.length === 0) return null;

  return (
    <div className="mt-4 grid gap-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-left"
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
          Archived ({routines.length})
        </div>
        {expanded ? (
          <ChevronUp className="size-3 text-subtle-foreground" />
        ) : (
          <ChevronDown className="size-3 text-subtle-foreground" />
        )}
      </button>

      {expanded && (
        <ul className="grid gap-1.5">
          {routines.map((r) => (
            <li
              key={r.id}
              className="surface-flat flex items-center gap-3 px-4 py-3 opacity-50"
            >
              <span className="size-5 shrink-0" aria-hidden />
              <span className="flex-1 text-[13px] text-muted-foreground line-through">
                {r.name}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
                archived
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── RoutinesView (main export) ────────────────────────────────── */

export function RoutinesView() {
  const today = todayISO();

  const data = useLiveQuery(async () => {
    const db = getDb();
    const [allRoutines, allChecks, allDomains] = await Promise.all([
      db.routines.toArray(),
      db.routineChecks.toArray(),
      db.domains.toArray(),
    ]);

    const routines = allRoutines.filter((r) => !r.deletedAt);
    const checks = allChecks.filter((c) => !c.deletedAt);
    const domains = allDomains.filter((d) => !d.deletedAt);

    return { routines, checks, domains };
  });

  if (data === undefined) {
    return <SkeletonRows />;
  }

  const { routines, checks, domains } = data;

  const active = routines.filter((r) => !r.archivedAt);
  const archived = routines.filter((r) => !!r.archivedAt);

  // Group active routines by timeOfDay
  const grouped = TIME_OF_DAY_ORDER.reduce<Record<string, Routine[]>>((acc, tod) => {
    acc[tod] = active.filter((r) => r.timeOfDay === tod);
    return acc;
  }, {});

  const hasActive = active.length > 0;

  return (
    <div className="grid gap-6">
      {/* Create form */}
      <RoutineForm />

      {/* Empty state */}
      {!hasActive && archived.length === 0 && (
        <div className="surface flex min-h-60 flex-col items-center justify-center gap-3 p-10 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-subtle-foreground">
            Routines
          </div>
          <h3 className="text-xl font-semibold tracking-tight">A clean slate.</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Build daily habits — morning stretches, evening reviews, or a 30-day challenge. Track
            your streaks and stay consistent.
          </p>
        </div>
      )}

      {/* Active routines grouped by time of day */}
      {hasActive && (
        <div className="grid gap-6">
          {TIME_OF_DAY_ORDER.map((tod) => (
            <TimeOfDaySection
              key={tod}
              label={TIME_OF_DAY_LABELS[tod] ?? tod}
              routines={grouped[tod] ?? []}
              checks={checks}
              domains={domains}
              today={today}
            />
          ))}
        </div>
      )}

      {/* Archived */}
      <ArchivedSection routines={archived} />
    </div>
  );
}

/* ─── Skeleton ─────────────────────────────────────────────────── */

function SkeletonRows() {
  return (
    <div className="grid gap-6">
      {['Morning', 'Anytime'].map((label) => (
        <section key={label} className="grid gap-2">
          <div className="flex items-center gap-3">
            <div className="h-3 w-16 animate-pulse rounded bg-border" />
            <div className="hairline flex-1 border-t" />
          </div>
          <ul className="grid gap-1.5">
            {Array.from({ length: label === 'Morning' ? 2 : 1 }).map((_, i) => (
              <li
                key={i}
                className="surface-flat h-14 animate-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
