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
import { deleteFoodLog, updateFoodLog } from '@/lib/food-logs';
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

  const dayLogs = useLiveQuery(
    async () => {
      const rows = await getDb().foodLogs.where('date').equals(day).toArray();
      return rows
        .filter((r) => !r.deletedAt)
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    },
    [day],
  );

  const totals = (dayLogs ?? []).reduce(
    (acc, log) => ({
      calories: acc.calories + log.totalCalories,
      protein: acc.protein + (log.totalProtein ?? 0),
      carbs: acc.carbs + (log.totalCarbs ?? 0),
      fat: acc.fat + (log.totalFat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

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
            className="rounded-md border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
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
              <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                today
              </span>
            ) : null}
          </span>
        </div>

        {dayLogs === undefined ? (
          <div className="surface-flat h-24 animate-pulse rounded-[14px] bg-bg-sunken" />
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
        <Utensils className="size-4 shrink-0 text-subtle-foreground" aria-hidden />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Log a meal: 2 eggs and toast with butter..."
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-subtle-foreground"
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
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
          Log
        </button>
      </div>
      {notice ? (
        <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
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
        <div className="text-[22px] font-semibold leading-none tabular-nums">
          {value}
          <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-subtle-foreground">
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

  const logs = useLiveQuery(
    async () => {
      const rows = await getDb().foodLogs.where('date').anyOf(days).toArray();
      return rows.filter((r) => !r.deletedAt);
    },
    [today],
  );

  const byDay = new Map<string, number>(days.map((d) => [d, 0]));
  for (const log of logs ?? []) {
    byDay.set(log.date, (byDay.get(log.date) ?? 0) + log.totalCalories);
  }
  const max = Math.max(1, ...byDay.values());

  return (
    <div className="surface-flat rounded-[14px] px-4 py-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
          Last 7 days
        </span>
        <span className="font-mono text-[10px] text-subtle-foreground">kcal / day</span>
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
              <span className="font-mono text-[9px] tabular-nums text-subtle-foreground opacity-0 transition-opacity group-hover:opacity-100">
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
  const kcal = logs.reduce((sum, l) => sum + l.totalCalories, 0);
  return (
    <section>
      <div className="mb-1.5 flex items-baseline justify-between px-1">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
          {MEAL_LABEL[meal]}
        </h2>
        <span className="font-mono text-[10px] tabular-nums text-subtle-foreground">
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
        <p className="text-sm font-medium text-foreground">{log.description}</p>
        {log.items.length > 0 ? (
          <ul className="mt-1 flex flex-col gap-0.5">
            {log.items.map((item, i) => (
              <li
                key={`${log.id}-${i}`}
                className="flex items-baseline gap-1.5 text-xs text-muted-foreground"
              >
                <span className="truncate">
                  {item.name}
                  {item.quantity ? (
                    <span className="text-subtle-foreground"> ({item.quantity})</span>
                  ) : null}
                </span>
                <span className="ml-auto shrink-0 font-mono text-[10px] tabular-nums text-subtle-foreground">
                  {item.calories} kcal
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 font-mono text-[10px] tabular-nums text-primary">
        {log.totalCalories} kcal
      </span>
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <select
          value={log.mealType}
          onChange={(e) => void updateFoodLog(log.id, { mealType: e.target.value as MealType })}
          aria-label="Meal type"
          className="rounded-md border border-border bg-card px-1.5 py-0.5 text-[11px] text-muted-foreground outline-none"
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
          className="flex size-7 items-center justify-center rounded-md text-subtle-foreground hover:bg-destructive/10 hover:text-destructive"
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
      <span className="flex size-12 items-center justify-center rounded-[14px] bg-bg-sunken text-subtle-foreground">
        <Utensils className="size-6" aria-hidden />
      </span>
      <p className="text-sm font-medium text-foreground">Nothing logged this day.</p>
      <p className="max-w-xs text-xs text-muted-foreground">
        Type or dictate what you ate above, or just tell the Notepad. AI estimates calories,
        protein, carbs, and fat.
      </p>
    </div>
  );
}
