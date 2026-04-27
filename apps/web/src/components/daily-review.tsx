'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { addDays, format } from 'date-fns';
import { CheckCircle2, ListChecks, MoonStar } from 'lucide-react';
import { DEFAULT_SETTINGS, getDb, isoDay } from '@drift/core';
import type { Task } from '@drift/core';
import { useAppStore } from '@/lib/app-store';
import { updateTask } from '@/lib/tasks';

const STORAGE_KEY = 'drift.lastReview';

export function DailyReviewTrigger() {
  const open = useAppStore((s) => s.reviewOpen);
  const close = useAppStore((s) => s.closeReview);
  const openReview = useAppStore((s) => s.openReview);
  const settings = useLiveQuery(async () => getDb().settings.get('singleton'));
  const reviewAt = settings?.dailyReviewAt ?? DEFAULT_SETTINGS.dailyReviewAt;

  useEffect(() => {
    function check() {
      const today = isoDay(new Date());
      const last = window.localStorage.getItem(STORAGE_KEY);
      if (last === today) return;
      const [hh, mm] = reviewAt.split(':').map(Number);
      const now = new Date();
      const trigger = new Date();
      trigger.setHours(hh ?? 17, mm ?? 30, 0, 0);
      if (now >= trigger) {
        openReview();
        window.localStorage.setItem(STORAGE_KEY, today);
      }
    }
    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [reviewAt, openReview]);

  if (!open) return null;
  return <DailyReview onClose={close} />;
}

function DailyReview({ onClose }: { onClose: () => void }) {
  const today = isoDay(new Date());
  const summary = useLiveQuery(async () => {
    const all = await getDb().tasks.toArray();
    const live = all.filter((t) => !t.deletedAt);
    const completedToday = live.filter(
      (t) => t.completedAt && t.completedAt.slice(0, 10) === today,
    );
    const slipped = live.filter(
      (t) =>
        t.status !== 'done' &&
        t.status !== 'archived' &&
        ((t.scheduledFor && t.scheduledFor <= today) ||
          (t.dueAt && t.dueAt.slice(0, 10) <= today)),
    );
    return { completedToday, slipped };
  });
  const [rolling, setRolling] = useState(false);

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
      <div className="surface w-full max-w-lg overflow-hidden">
        <header className="border-b border-hairline px-6 py-5">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-subtle-foreground">
            <MoonStar className="size-3.5" /> Daily review
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">
            {format(new Date(), 'EEEE, MMMM d')}
          </h2>
        </header>
        <div className="grid grid-cols-2 divide-x divide-border border-b border-hairline">
          <Stat label="Done today" value={summary?.completedToday.length ?? 0} icon={CheckCircle2} tone="text-success" />
          <Stat label="Slipped" value={summary?.slipped.length ?? 0} icon={ListChecks} tone="text-priority-urgent" />
        </div>
        <div className="scrollbar-thin max-h-72 overflow-y-auto p-5">
          {summary?.slipped.length ? (
            <>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
                Roll to tomorrow?
              </div>
              <ul className="flex flex-col gap-1">
                {summary.slipped.slice(0, 8).map((t) => (
                  <SlipRow key={t.id} task={t} />
                ))}
              </ul>
              {summary.slipped.length > 8 ? (
                <div className="mt-2 text-xs text-muted-foreground">
                  And {summary.slipped.length - 8} more.
                </div>
              ) : null}
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              Nothing slipped. Solid day.
            </div>
          )}
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-hairline px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            Skip
          </button>
          <button
            type="button"
            disabled={!summary?.slipped.length || rolling}
            onClick={rollForward}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
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
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
          {label}
        </div>
      </div>
    </div>
  );
}

function SlipRow({ task }: { task: Task }) {
  return (
    <li className="surface-flat flex items-center gap-2 px-3 py-1.5 text-sm">
      <span className="size-1.5 rounded-full bg-priority-urgent" aria-hidden />
      <span className="truncate">{task.title}</span>
      {task.scheduledFor ? (
        <span className="ml-auto font-mono text-[11px] text-subtle-foreground">
          {task.scheduledFor}
        </span>
      ) : null}
    </li>
  );
}
