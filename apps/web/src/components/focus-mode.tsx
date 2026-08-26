'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pause, Play, RotateCcw, Square, X } from 'lucide-react';
import { DEFAULT_SETTINGS, getDb, todayIso } from '@ops-dashboard/core';
import type { Task } from '@ops-dashboard/core';
import { useAppStore } from '@/lib/app-store';
import {
  accumulatedFocusMinutes,
  elapsedSessionMinutes,
  elapsedSessionMs,
} from '@/lib/focus-timer';
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
    const today = todayIso();
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const exitButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const startedRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);

  const recordFocusTime = useCallback(async () => {
    const elapsedMs = elapsedSessionMs(elapsedRef.current, startedRef.current, Date.now());
    const elapsed = elapsedSessionMinutes(elapsedMs);
    startedRef.current = null;
    elapsedRef.current = 0;
    if (!activeId || elapsed === 0) return;
    const task = await getDb().tasks.get(activeId);
    if (task) {
      await updateTask(activeId, {
        actualMinutes: accumulatedFocusMinutes(task.actualMinutes, elapsedMs),
      });
    }
  }, [activeId]);

  const completePhase = useCallback(async () => {
    if (phase === 'focus') await recordFocusTime();
    else {
      startedRef.current = null;
      elapsedRef.current = 0;
    }
    setPhase((p) => (p === 'focus' ? 'break' : 'focus'));
  }, [phase, recordFocusTime]);

  const completeRef = useRef<() => void>(() => {});
  useEffect(() => {
    completeRef.current = completePhase;
  }, [completePhase]);

  const endSession = useCallback(async () => {
    setRunning(false);
    if (phase === 'focus') await recordFocusTime();
    else {
      startedRef.current = null;
      elapsedRef.current = 0;
    }
    setPhase('focus');
    setActiveId(null);
    setSecondsLeft(focusMin * 60);
    close();
  }, [close, focusMin, phase, recordFocusTime]);

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
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => exitButtonRef.current?.focus());
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        void endSession();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
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
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [endSession, open]);

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
    elapsedRef.current = elapsedSessionMs(elapsedRef.current, startedRef.current, Date.now());
    startedRef.current = null;
    setRunning(false);
  }

  function reset() {
    setRunning(false);
    startedRef.current = null;
    elapsedRef.current = 0;
    setSecondsLeft((phase === 'focus' ? focusMin : breakMin) * 60);
  }

  const total = (phase === 'focus' ? focusMin : breakMin) * 60;
  const progress = ((total - secondsLeft) / total) * 100;
  const mm = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, '0');
  const ss = (secondsLeft % 60).toString().padStart(2, '0');
  const active = activeId ? candidates?.find((t) => t.id === activeId) : null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex overflow-y-auto bg-black/80 p-4 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-label="Focus mode"
    >
      <button
        ref={exitButtonRef}
        type="button"
        onClick={() => void endSession()}
        className="bg-card text-muted-foreground hover:text-foreground fixed top-4 right-4 inline-flex size-11 items-center justify-center rounded-md border"
        aria-label="Exit focus mode"
      >
        <X className="size-4" />
      </button>
      <div className="m-auto flex min-h-full w-full max-w-xl flex-col items-center justify-center gap-5 py-12 sm:gap-8 sm:px-6">
        <div
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] tracking-[0.22em] uppercase',
            phase === 'focus'
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-success/30 bg-success/10 text-success',
          )}
        >
          <span className="live-dot size-1.5 rounded-full bg-current" aria-hidden />
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
            <div
              className="font-mono text-5xl font-light tabular-nums sm:text-6xl"
              role="timer"
              aria-live="off"
            >
              {mm}:{ss}
            </div>
            {active ? (
              <div className="text-muted-foreground mt-2 max-w-[14rem] truncate text-sm">
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
              className="bg-card inline-flex h-11 items-center gap-2 rounded-md border px-4 text-sm"
            >
              <Pause className="size-4" /> Pause
            </button>
          ) : (
            <button
              type="button"
              onClick={() => start(active ?? candidates?.[0] ?? undefined)}
              className="bg-primary text-primary-foreground inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium"
            >
              <Play className="size-4" /> Start
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            className="bg-card text-muted-foreground hover:text-foreground inline-flex size-11 items-center justify-center rounded-md border text-sm"
            aria-label="Reset timer"
            title="Reset timer"
          >
            <RotateCcw className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => void endSession()}
            className="bg-card text-muted-foreground hover:text-foreground inline-flex h-11 items-center gap-2 rounded-md border px-3 text-sm"
          >
            <Square className="size-4" /> End
          </button>
        </div>

        {!active && candidates && candidates.length > 0 ? (
          <div className="w-full">
            <div className="text-subtle-foreground mb-2 text-center font-mono text-[10px] tracking-[0.18em] uppercase">
              Choose a focus task
            </div>
            <div className="surface-flat max-h-40 scrollbar-thin overflow-y-auto p-1">
              {candidates.slice(0, 6).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => start(t)}
                  className="hover:bg-accent flex min-h-10 w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm"
                >
                  <span className="truncate">{t.title}</span>
                  {t.estimateMinutes ? (
                    <span className="text-muted-foreground font-mono text-xs">
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
