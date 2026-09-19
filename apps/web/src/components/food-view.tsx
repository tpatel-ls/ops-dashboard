'use client';

import { useState, useTransition } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, parseISO } from 'date-fns';
import {
  Beef,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  Droplet,
  Flame,
  Loader2,
  Mic,
  MicOff,
  Trash2,
  Utensils,
  Wheat,
} from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import type { FoodLog, MealType } from '@ops-dashboard/core';
import { cn } from '@ops-dashboard/ui';
import {
  compareFoodLogCreation,
  deleteFoodLog,
  foodEstimate,
  sumFoodLogTotals,
  updateFoodLog,
} from '@/lib/food-logs';
import { processBrainDump } from '@/lib/route-items';
import { addDaysISO, todayISO } from '@/lib/routines';
import { useVoiceInput } from '@/lib/use-voice-input';
import { ViewShell } from '@/components/view-shell';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABEL: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

export function FoodView() {
  const [day, setDay] = useState<string>(() => todayISO());
  const today = todayISO();

  const dayLogs = useLiveQuery(async () => {
    const rows = await getDb().foodLogs.where('date').equals(day).toArray();
    return rows.filter((r) => !r.deletedAt).sort(compareFoodLogCreation);
  }, [day]);

  const totals = sumFoodLogTotals(dayLogs ?? []);

  const isToday = day === today;

  return (
    <ViewShell
      eyebrow="Health"
      title="Food"
      subtitle="Say what you ate; AI estimates the calories and macros."
    >
      <div className="flex flex-col gap-5">
        <QuickLog />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label={isToday ? 'Calories today' : 'Calories'}
            value={totals.calories}
            unit="kcal"
            icon={Flame}
            color="var(--primary)"
          />
          <StatTile
            label="Protein"
            value={totals.protein}
            unit="g"
            icon={Beef}
            color="var(--success)"
          />
          <StatTile
            label="Carbs"
            value={totals.carbs}
            unit="g"
            icon={Wheat}
            color="var(--warning)"
          />
          <StatTile
            label="Fat"
            value={totals.fat}
            unit="g"
            icon={Droplet}
            color="oklch(0.65 0.18 280)"
          />
        </div>

        <WeekTrend day={day} today={today} onSelect={setDay} />

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous day"
            onClick={() => setDay((d) => addDaysISO(d, -1))}
            className="kbd"
          >
            <ChevronLeft className="size-3" />
          </button>
          <button
            type="button"
            onClick={() => setDay(today)}
            className="bg-card text-muted-foreground hover:text-foreground rounded-md border px-2.5 py-1 text-xs"
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Next day"
            onClick={() => setDay((d) => addDaysISO(d, 1))}
            className="kbd"
          >
            <ChevronRight className="size-3" />
          </button>
          <span className="ml-2 text-sm font-semibold tracking-tight">
            {format(parseISO(day), 'EEEE, MMM d')}
            {isToday ? (
              <span className="text-primary ml-2 font-mono text-[10px] tracking-[0.14em] uppercase">
                today
              </span>
            ) : null}
          </span>
        </div>

        {dayLogs === undefined ? (
          <div className="surface-flat bg-bg-sunken h-24 animate-pulse rounded-[14px]" />
        ) : dayLogs.length === 0 ? (
          <EmptyDay />
        ) : (
          <div className="flex flex-col gap-4">
            {MEAL_ORDER.map((meal) => {
              const logs = dayLogs.filter((l) => l.mealType === meal);
              if (logs.length === 0) return null;
              return <MealGroup key={meal} meal={meal} logs={logs} />;
            })}
          </div>
        )}
      </div>
    </ViewShell>
  );
}

/** One-line capture with a food bias: the "(food log) " prefix nudges the
 *  brain to classify as food. Dumb and reliable. */
function QuickLog() {
  const [value, setValue] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const { available, listening, transcribing, toggle } = useVoiceInput({
    onTranscript: (text) => setValue((v) => (v.trim() ? `${v.trim()} ${text}` : text)),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = value.trim();
    if (!text || pending) return;
    startTransition(async () => {
      const results = await processBrainDump(`(food log) ${text}`, 'text');
      setNotice(
        results.some((r) => r.aiOffline)
          ? 'AI offline - captured as a task instead; find it in Tasks.'
          : null,
      );
      setValue('');
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="surface-flat flex items-center gap-2 rounded-[14px] px-4 py-2.5">
        <Utensils className="text-subtle-foreground size-4 shrink-0" aria-hidden />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Log a meal: 2 eggs and toast with butter..."
          className="text-foreground placeholder:text-subtle-foreground w-full bg-transparent text-sm outline-none"
          aria-label="Log food"
          disabled={pending || listening || transcribing}
          autoComplete="off"
          spellCheck={false}
        />
        {available ? (
          <button
            type="button"
            onClick={toggle}
            disabled={pending || transcribing}
            aria-label={
              transcribing ? 'Transcribing' : listening ? 'Stop recording' : 'Dictate a meal'
            }
            className={cn(
              'flex shrink-0 items-center justify-center rounded-md p-1 transition-colors',
              listening
                ? 'text-destructive animate-pulse'
                : 'text-subtle-foreground hover:text-foreground',
            )}
          >
            {transcribing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : listening ? (
              <MicOff className="size-4" />
            ) : (
              <Mic className="size-4" />
            )}
          </button>
        ) : null}
        <button
          type="submit"
          disabled={pending || transcribing || !value.trim()}
          className="bg-primary text-primary-foreground flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
          Log
        </button>
      </div>
      {notice ? (
        <div className="border-warning/40 bg-warning/10 text-warning flex items-center gap-2 rounded-md border px-3 py-2 text-xs">
          <CloudOff className="size-3.5 shrink-0" aria-hidden />
          <span>{notice}</span>
        </div>
      ) : null}
    </form>
  );
}

function StatTile({
  label,
  value,
  unit,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  icon: typeof Flame;
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
        <div className="text-[22px] leading-none font-semibold tabular-nums">
          {value}
          <span className="text-muted-foreground ml-1 text-xs font-normal">{unit}</span>
        </div>
        <div className="text-subtle-foreground mt-1 font-mono text-[10px] tracking-[0.16em] uppercase">
          {label}
        </div>
      </div>
    </div>
  );
}

/** Last 7 days of total kcal as plain div bars; click a bar to jump to it. */
function WeekTrend({
  day,
  today,
  onSelect,
}: {
  day: string;
  today: string;
  onSelect: (day: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(today, i - 6));

  const logs = useLiveQuery(async () => {
    const rows = await getDb().foodLogs.where('date').anyOf(days).toArray();
    return rows.filter((r) => !r.deletedAt);
  }, [today]);

  const byDay = new Map<string, number>(days.map((d) => [d, 0]));
  for (const log of logs ?? []) {
    byDay.set(log.date, (byDay.get(log.date) ?? 0) + foodEstimate(log.totalCalories));
  }
  const max = Math.max(1, ...byDay.values());

  return (
    <div className="surface-flat rounded-[14px] px-4 py-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-subtle-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
          Last 7 days
        </span>
        <span className="text-subtle-foreground font-mono text-[10px]">kcal / day</span>
      </div>
      <div className="flex items-end gap-2">
        {days.map((d) => {
          const kcal = byDay.get(d) ?? 0;
          const isToday = d === today;
          const isSelected = d === day;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(d)}
              title={`${format(parseISO(d), 'EEE, MMM d')}: ${kcal} kcal`}
              className="group flex flex-1 flex-col items-center gap-1"
            >
              <span className="text-subtle-foreground font-mono text-[9px] tabular-nums opacity-0 transition-opacity group-hover:opacity-100">
                {kcal > 0 ? kcal : ''}
              </span>
              <span className="flex h-16 w-full items-end">
                <span
                  aria-hidden
                  className={cn(
                    'w-full rounded-t-[4px] transition-colors',
                    isToday ? 'bg-primary' : 'bg-bg-sunken group-hover:bg-border',
                  )}
                  style={{ height: kcal > 0 ? `${Math.max(6, (kcal / max) * 100)}%` : '3px' }}
                />
              </span>
              <span
                className={cn(
                  'font-mono text-[9px] uppercase',
                  isSelected ? 'text-foreground' : 'text-subtle-foreground',
                )}
              >
                {format(parseISO(d), 'EEE')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MealGroup({ meal, logs }: { meal: MealType; logs: FoodLog[] }) {
  const kcal = sumFoodLogTotals(logs).calories;
  return (
    <section>
      <div className="mb-1.5 flex items-baseline justify-between px-1">
        <h2 className="text-subtle-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
          {MEAL_LABEL[meal]}
        </h2>
        <span className="text-subtle-foreground font-mono text-[10px] tabular-nums">
          {kcal} kcal
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {logs.map((log) => (
          <FoodLogRow key={log.id} log={log} />
        ))}
      </ul>
    </section>
  );
}

function FoodLogRow({ log }: { log: FoodLog }) {
  return (
    <li className="surface-flat group flex items-start gap-3 rounded-[14px] px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-sm font-medium">{log.description}</p>
        {log.items.length > 0 ? (
          <ul className="mt-1 flex flex-col gap-0.5">
            {log.items.map((item, i) => (
              <li
                key={`${log.id}-${i}`}
                className="text-muted-foreground flex items-baseline gap-1.5 text-xs"
              >
                <span className="truncate">
                  {item.name}
                  {item.quantity ? (
                    <span className="text-subtle-foreground"> ({item.quantity})</span>
                  ) : null}
                </span>
                <span className="text-subtle-foreground ml-auto shrink-0 font-mono text-[10px] tabular-nums">
                  {foodEstimate(item.calories)} kcal
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <span className="bg-primary-soft text-primary shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] tabular-nums">
        {foodEstimate(log.totalCalories)} kcal
      </span>
      <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        <select
          value={log.mealType}
          onChange={(e) => void updateFoodLog(log.id, { mealType: e.target.value as MealType })}
          aria-label="Meal type"
          className="border-border bg-card text-muted-foreground rounded-md border px-1.5 py-0.5 text-[11px] outline-none"
        >
          {MEAL_ORDER.map((m) => (
            <option key={m} value={m}>
              {MEAL_LABEL[m]}
            </option>
          ))}
        </select>
        <button
          type="button"
          title="Delete"
          aria-label={`Delete ${log.description}`}
          onClick={() => void deleteFoodLog(log.id)}
          className="text-subtle-foreground hover:bg-destructive/10 hover:text-destructive flex size-7 items-center justify-center rounded-md"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
    </li>
  );
}

function EmptyDay() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <span className="bg-bg-sunken text-subtle-foreground flex size-12 items-center justify-center rounded-[14px]">
        <Utensils className="size-6" aria-hidden />
      </span>
      <p className="text-foreground text-sm font-medium">Nothing logged this day.</p>
      <p className="text-muted-foreground max-w-xs text-xs">
        Type or dictate what you ate above, or just tell the Notepad. AI estimates calories,
        protein, carbs, and fat.
      </p>
    </div>
  );
}
