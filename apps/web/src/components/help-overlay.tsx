'use client';

import { useAppStore } from '@/lib/app-store';

const SECTIONS: Array<{ heading: string; rows: Array<[string, string]> }> = [
  {
    heading: 'Global',
    rows: [
      ['? ', 'Open this overlay'],
      ['Cmd K', 'Command palette'],
      ['g i', 'Quick add'],
      ['f', 'Focus mode'],
      ['Esc', 'Close any overlay'],
    ],
  },
  {
    heading: 'Navigate',
    rows: [
      ['g t', 'Today'],
      ['g w', 'Week'],
      ['g m', 'Month'],
      ['g c', 'Calendar'],
      ['g k', 'Kanban'],
      ['g b', 'Whiteboards'],
      ['g n', 'Inbox'],
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
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="surface w-full max-w-2xl overflow-hidden">
        <header className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-subtle-foreground">
              Reference
            </div>
            <h2 className="text-lg font-semibold tracking-tight">Keyboard shortcuts</h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="kbd"
            aria-label="Close"
          >
            Esc
          </button>
        </header>
        <div className="grid gap-6 p-5 sm:grid-cols-3">
          {SECTIONS.map((s) => (
            <div key={s.heading}>
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
