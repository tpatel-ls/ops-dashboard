'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pause, Play, RotateCcw, Square, X } from 'lucide-react';
import { DEFAULT_SETTINGS, getDb } from '@ops-dashboard/core';
import type { Task } from '@ops-dashboard/core';
import { useAppStore } from '@/lib/app-store';
import { setTaskStatus, updateTask } from '@/lib/tasks';
import { cn } from '@ops-dashboard/ui';

type Phase = 'focus' | 'break';

export function FocusMode() {
  const open = useAppStore((s) => s.focusOpen);
  const close = useAppStore((s) => s.closeFocus);
  const settings = useLiveQuery(async () => getDb().settings.get('singleton'));
  const focusMin = settings?.pomodoroFocusMinutes ?? DEFAULT_SETTINGS.pomodoroFocusMinutes;
  const breakMin = settings?.pomodoroBreakMinutes ?? DEFAULT_SETTINGS.pomodoroBreakMinutes;

  const candidates = useLiveQuery(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const all = await getDb().tasks.toArray();
    return all
      .filter(
        (t) =>
          !t.deletedAt &&
          t.status !== 'done' &&
          t.status !== 'archived' &&
          (t.scheduledFor === today || t.status === 'doing'),
      )
      .sort((a, b) => b.priority - a.priority);
  });

  const [phase, setPhase] = useState<Phase>('focus');
  const [secondsLeft, setSecondsLeft] = useState(focusMin * 60);
  const [running, setRunning] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const startedRef = useRef<number | null>(null);

  const completePhase = useCallback(async () => {
    if (phase === 'focus' && activeId && startedRef.current) {
      const elapsed = Math.round((Date.now() - startedRef.current) / 60000);
      const task = await getDb().tasks.get(activeId);
      if (task) {
        await updateTask(activeId, {
          actualMinutes: (task.actualMinutes ?? 0) + elapsed,
        });
      }
    }
    setPhase((p) => (p === 'focus' ? 'break' : 'focus'));
  }, [phase, activeId]);

  const completeRef = useRef<() => void>(() => {});
  useEffect(() => {
    completeRef.current = completePhase;
  }, [completePhase]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSecondsLeft((phase === 'focus' ? focusMin : breakMin) * 60);
  }, [open, phase, focusMin, breakMin]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          setRunning(false);
          completeRef.current();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [close, open]);

  if (!open) return null;

  function start(task?: Task) {
    if (task) {
      setActiveId(task.id);
      void setTaskStatus(task.id, 'doing');
    }
    startedRef.current = Date.now();
    setRunning(true);
  }

  function pause() {
    setRunning(false);
  }

  function reset() {
    setRunning(false);
    setSecondsLeft((phase === 'focus' ? focusMin : breakMin) * 60);
  }

  const total = (phase === 'focus' ? focusMin : breakMin) * 60;
  const progress = ((total - secondsLeft) / total) * 100;
  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const ss = (secondsLeft % 60).toString().padStart(2, '0');
  const active = activeId ? candidates?.find((t) => t.id === activeId) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex overflow-y-auto bg-black/80 p-4 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-label="Focus mode"
    >
      <button
        type="button"
        onClick={close}
        className="fixed right-4 top-4 inline-flex size-11 items-center justify-center rounded-md border bg-card text-muted-foreground hover:text-foreground"
        aria-label="Exit focus mode"
      >
        <X className="size-4" />
      </button>
      <div className="m-auto flex min-h-full w-full max-w-xl flex-col items-center justify-center gap-5 py-12 sm:gap-8 sm:px-6">
        <div
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em]',
            phase === 'focus'
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-success/30 bg-success/10 text-success',
          )}
        >
          <span className="size-1.5 rounded-full bg-current live-dot" aria-hidden />
          {phase === 'focus' ? 'Focus' : 'Break'} session
        </div>

        <div className="relative size-60 sm:size-72">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            <circle cx="50" cy="50" r="44" fill="none" stroke="var(--border)" strokeWidth="2" />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={`${(progress / 100) * 2 * Math.PI * 44} ${2 * Math.PI * 44}`}
              className={phase === 'focus' ? 'text-primary' : 'text-success'}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="font-mono text-5xl font-light tabular-nums sm:text-6xl" role="timer" aria-live="off">
              {mm}:{ss}
            </div>
            {active ? (
              <div className="mt-2 max-w-[14rem] truncate text-sm text-muted-foreground">
                {active.title}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {running ? (
            <button
              type="button"
              onClick={pause}
              className="inline-flex h-11 items-center gap-2 rounded-md border bg-card px-4 text-sm"
            >
              <Pause className="size-4" /> Pause
            </button>
          ) : (
            <button
              type="button"
              onClick={() => start(active ?? candidates?.[0] ?? undefined)}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              <Play className="size-4" /> Start
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            className="inline-flex size-11 items-center justify-center rounded-md border bg-card text-sm text-muted-foreground hover:text-foreground"
            aria-label="Reset timer"
            title="Reset timer"
          >
            <RotateCcw className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setRunning(false);
              setPhase('focus');
              setActiveId(null);
              setSecondsLeft(focusMin * 60);
              close();
            }}
            className="inline-flex h-11 items-center gap-2 rounded-md border bg-card px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            <Square className="size-4" /> End
          </button>
        </div>

        {!active && candidates && candidates.length > 0 ? (
          <div className="w-full">
            <div className="mb-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
              Choose a focus task
            </div>
            <div className="surface-flat scrollbar-thin max-h-40 overflow-y-auto p-1">
              {candidates.slice(0, 6).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => start(t)}
                  className="flex min-h-10 w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <span className="truncate">{t.title}</span>
                  {t.estimateMinutes ? (
                    <span className="font-mono text-xs text-muted-foreground">
                      {t.estimateMinutes}m
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
