'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { addDays, format } from 'date-fns';
import { CheckCircle2, ListChecks, MoonStar, X } from 'lucide-react';
import { getDb, isoDay } from '@ops-dashboard/core';
import type { Task } from '@ops-dashboard/core';
import { useAppStore } from '@/lib/app-store';
import { taskCompletedOn, taskNeedsRollForward } from '@/lib/daily-review';
import { updateTask } from '@/lib/tasks';

export function DailyReviewDialog() {
  const open = useAppStore((s) => s.reviewOpen);
  const close = useAppStore((s) => s.closeReview);

  if (!open) return null;
  return <DailyReview onClose={close} />;
}

function DailyReview({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const today = isoDay(new Date());
  const summary = useLiveQuery(async () => {
    const all = await getDb().tasks.toArray();
    const completedToday = all.filter((task) => taskCompletedOn(task, today));
    const slipped = all.filter((task) => taskNeedsRollForward(task, today));
    return { completedToday, slipped };
  });
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    window.requestAnimationFrame(() => closeRef.current?.focus());
    return () => previousFocus?.focus();
  }, []);

  function keepFocusInside(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [],
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function rollForward() {
    if (!summary?.slipped) return;
    setRolling(true);
    const tomorrow = isoDay(addDays(new Date(), 1));
    for (const t of summary.slipped) {
      await updateTask(t.id, { scheduledFor: tomorrow });
    }
    setRolling(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={keepFocusInside}
        className="surface w-full max-w-lg overflow-hidden"
      >
        <header className="border-hairline border-b px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-subtle-foreground flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] uppercase">
                <MoonStar className="size-3.5" /> Daily review
              </div>
              <h2 id={titleId} className="mt-1 text-xl font-semibold tracking-tight">
                {format(new Date(), 'EEEE, MMMM d')}
              </h2>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close daily review"
              className="text-muted-foreground hover:bg-accent hover:text-foreground -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </header>
        <div className="divide-border border-hairline grid grid-cols-2 divide-x border-b">
          <Stat
            label="Done today"
            value={summary?.completedToday.length ?? 0}
            icon={CheckCircle2}
            tone="text-success"
          />
          <Stat
            label="Slipped"
            value={summary?.slipped.length ?? 0}
            icon={ListChecks}
            tone="text-priority-urgent"
          />
        </div>
        <div className="max-h-72 scrollbar-thin overflow-y-auto p-5">
          {summary?.slipped.length ? (
            <>
              <div className="text-subtle-foreground mb-2 font-mono text-[10px] tracking-[0.18em] uppercase">
                Roll to tomorrow?
              </div>
              <ul className="flex flex-col gap-1">
                {summary.slipped.slice(0, 8).map((t) => (
                  <SlipRow key={t.id} task={t} />
                ))}
              </ul>
              {summary.slipped.length > 8 ? (
                <div className="text-muted-foreground mt-2 text-xs">
                  And {summary.slipped.length - 8} more.
                </div>
              ) : null}
            </>
          ) : (
            <div className="text-muted-foreground text-sm">Nothing slipped. Solid day.</div>
          )}
        </div>
        <footer className="border-hairline flex items-center justify-end gap-2 border-t px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="bg-card text-muted-foreground hover:text-foreground min-h-11 rounded-md border px-3 text-sm"
          >
            Skip
          </button>
          <button
            type="button"
            disabled={!summary?.slipped.length || rolling}
            onClick={rollForward}
            className="bg-primary text-primary-foreground min-h-11 rounded-md px-3 text-sm font-medium disabled:opacity-50"
          >
            Roll all forward
          </button>
        </footer>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof MoonStar;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <Icon className={`size-5 ${tone}`} aria-hidden />
      <div>
        <div className="font-mono text-2xl tabular-nums">{value}</div>
        <div className="text-subtle-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
          {label}
        </div>
      </div>
    </div>
  );
}

function SlipRow({ task }: { task: Task }) {
  return (
    <li className="surface-flat flex items-center gap-2 px-3 py-1.5 text-sm">
      <span className="bg-priority-urgent size-1.5 rounded-full" aria-hidden />
      <span className="truncate">{task.title}</span>
      {task.scheduledFor ? (
        <span className="text-subtle-foreground ml-auto font-mono text-[11px]">
          {task.scheduledFor}
        </span>
      ) : null}
    </li>
  );
}
