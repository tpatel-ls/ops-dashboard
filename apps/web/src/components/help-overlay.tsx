'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '@/lib/app-store';

const SECTIONS: Array<{ heading: string; rows: Array<[string, string]> }> = [
  {
    heading: 'Global',
    rows: [
      ['?', 'Open this overlay'],
      ['Cmd/Ctrl K', 'Command palette'],
      ['g a', 'Add task'],
      ['f', 'Focus mode'],
      ['Esc', 'Close any overlay'],
    ],
  },
  {
    heading: 'Navigate',
    rows: [
      ['g h', 'Home'],
      ['g t', 'Tasks'],
      ['g p', 'Projects'],
      ['g c', 'Calendar'],
      ['g i', 'Inbox'],
      ['g k', 'Kanban'],
      ['g l', 'Power Dialer'],
      ['g n', 'Notepad'],
      ['g s', 'Settings'],
    ],
  },
  {
    heading: 'Quick add',
    rows: [
      ['#tag', 'Adds a tag'],
      ['!! and !!!', 'Sets priority 2 or 3'],
      ['tomorrow 3pm', 'Schedules with time'],
      ['Cmd/Ctrl Enter', 'Save'],
    ],
  },
];

export function HelpOverlay() {
  const open = useAppStore((s) => s.helpOpen);
  const close = useAppStore((s) => s.closeHelp);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open, close]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-help-title"
        className="command-surface max-h-[92dvh] w-full max-w-3xl overflow-hidden rounded-t-lg sm:rounded-lg"
      >
        <header className="relative flex items-center justify-between border-b border-hairline px-5 py-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-subtle-foreground">
              Reference
            </div>
            <h2 id="keyboard-help-title" className="text-lg font-semibold tracking-tight">
              Keyboard shortcuts
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={close}
            className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close keyboard help"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>
        <div className="scrollbar-thin grid max-h-[calc(92dvh-77px)] gap-4 overflow-y-auto p-5 sm:grid-cols-3">
          {SECTIONS.map((s) => (
            <section key={s.heading} className="border-t pt-4 first:border-t-0 first:pt-0 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0 sm:first:border-l-0 sm:first:pl-0">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
                {s.heading}
              </div>
              <ul className="space-y-1.5 text-sm">
                {s.rows.map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{v}</span>
                    <span className="kbd shrink-0">{k}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
