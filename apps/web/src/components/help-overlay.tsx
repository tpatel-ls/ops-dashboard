'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/app-store';

const SECTIONS: Array<{ heading: string; rows: Array<[string, string]> }> = [
  {
    heading: 'Global',
    rows: [
      ['? ', 'Open this overlay'],
      ['Cmd K', 'Command palette'],
      ['g i', 'Work logger'],
      ['f', 'Focus mode'],
      ['Esc', 'Close any overlay'],
    ],
  },
  {
    heading: 'Navigate',
    rows: [
      ['g d', 'Dashboard'],
      ['g t', 'Briefing'],
      ['g p', 'Notepad'],
      ['g j', 'Projects'],
      ['g h', 'Habits'],
      ['g r', 'Routines'],
      ['g w', 'Week'],
      ['g m', 'Month'],
      ['g c', 'Calendar'],
      ['g k', 'Kanban'],
      ['g l', 'Power Dialer'],
      ['g b', 'Whiteboards'],
      ['g n', 'Inbox'],
      ['g x', 'Devices'],
      ['g s', 'Settings'],
    ],
  },
  {
    heading: 'Quick add',
    rows: [
      ['#tag', 'Adds a tag'],
      ['!! and !!!', 'Sets priority 2 or 3'],
      ['tomorrow 3pm', 'Schedules with time'],
      ['Cmd Enter', 'Save'],
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-help-title"
        className="command-surface w-full max-w-3xl overflow-hidden rounded-[22px]"
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
            className="kbd"
            aria-label="Close"
          >
            Esc
          </button>
        </header>
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          {SECTIONS.map((s) => (
            <div key={s.heading} className="rounded-[16px] border bg-bg-sunken/45 p-3">
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
