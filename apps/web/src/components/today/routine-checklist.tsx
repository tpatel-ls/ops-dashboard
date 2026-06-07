'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Flame } from 'lucide-react';
import { getDb } from '@drift/core';
import type { TimeOfDay } from '@drift/core';
import { computeStreak, todayISO, toggleRoutineCheck } from '@/lib/routines';
import { cn } from '@drift/ui';

const TIME_ORDER: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'anytime'];
const TIME_LABEL: Record<TimeOfDay, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  anytime: 'Anytime',
};

export function RoutineChecklist() {
  const today = todayISO();

  const data = useLiveQuery(async () => {
    const db = getDb();
    const [routines, checks] = await Promise.all([
      db.routines.toArray(),
      db.routineChecks.toArray(),
    ]);

    const activeRoutines = routines.filter((r) => !r.deletedAt && !r.archivedAt);
    const activeChecks = checks.filter((c) => !c.deletedAt);

    // Group checks by routineId for streak computation
    const checksByRoutine: Record<string, typeof activeChecks> = {};
    for (const check of activeChecks) {
      (checksByRoutine[check.routineId] ??= []).push(check);
    }

    // Today's checks: routineId -> done
    const todayDone: Record<string, boolean> = {};
    for (const check of activeChecks) {
      if (check.date === today) todayDone[check.routineId] = check.done;
    }

    // Group routines by timeOfDay
    const grouped: Partial<Record<TimeOfDay, typeof activeRoutines>> = {};
    for (const r of activeRoutines) {
      const tod = r.timeOfDay as TimeOfDay;
      if (!grouped[tod]) grouped[tod] = [];
      grouped[tod]!.push(r);
    }

    return {
      grouped,
      checksByRoutine,
      todayDone,
    };
  });

  if (!data) {
    return (
      <div className="surface h-48 animate-pulse" />
    );
  }

  const { grouped, checksByRoutine, todayDone } = data;
  const hasAny = TIME_ORDER.some((tod) => (grouped[tod]?.length ?? 0) > 0);

  return (
    <section className="surface flex flex-col">
      <div className="hairline flex items-center border-b px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
          Routines
        </span>
        <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">{today}</span>
      </div>

      {!hasAny ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 p-8 text-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-subtle-foreground">
            routines
          </span>
          <h3 className="text-base font-semibold tracking-tight">A clean slate.</h3>
          <p className="text-sm text-muted-foreground">
            Set up daily routines to track habits over time.
          </p>
        </div>
      ) : (
        <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-3">
          <div className="flex flex-col gap-4">
            {TIME_ORDER.map((tod) => {
              const routines = grouped[tod];
              if (!routines || routines.length === 0) return null;
              return (
                <div key={tod}>
                  <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle-foreground">
                    {TIME_LABEL[tod]}
                  </div>
                  <ul className="flex flex-col gap-1">
                    {routines.map((routine) => {
                      const checkedToday = todayDone[routine.id] === true;
                      const streak = computeStreak(checksByRoutine[routine.id] ?? [], today);

                      return (
                        <li key={routine.id} className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              toggleRoutineCheck(routine.id, today, !checkedToday)
                            }
                            className={cn(
                              'inline-flex size-5 shrink-0 items-center justify-center rounded-full border transition-all',
                              checkedToday
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border-strong text-transparent hover:border-primary hover:bg-primary/10',
                            )}
                            aria-label={checkedToday ? 'Uncheck routine' : 'Check routine'}
                          >
                            <Check className="size-3" strokeWidth={3} aria-hidden />
                          </button>

                          <span
                            className={cn(
                              'flex-1 text-[13px] leading-5',
                              checkedToday && 'text-muted-foreground line-through decoration-muted-foreground/40',
                            )}
                          >
                            {routine.name}
                          </span>

                          {streak > 0 && (
                            <span className="inline-flex items-center gap-0.5 font-mono text-[10px] tabular-nums text-primary">
                              <Flame className="size-3" aria-hidden />
                              {streak}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
