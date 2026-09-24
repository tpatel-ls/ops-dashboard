'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import {
  Archive,
  BookOpen,
  FileText,
  Inbox,
  Plus,
  Repeat,
  StickyNote,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import type { Capture, CaptureKind } from '@ops-dashboard/core';
import { compareCaptureRecency, dismissCapture, deleteCapture } from '@/lib/captures';
import { ViewShell } from '@/components/view-shell';
import { cn } from '@ops-dashboard/ui';
import { useAppStore } from '@/lib/app-store';
import { relativeTimeLabel } from '@/lib/relative-time';

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const KIND_LABEL: Record<CaptureKind, string> = {
  task: 'Task',
  note: 'Note',
  journal: 'Journal',
  event: 'Event',
  person: 'Person',
  quote: 'Quote',
  routine: 'Routine',
  food: 'Food',
  habit: 'Habit',
};

const KIND_ICON: Record<CaptureKind, React.ElementType> = {
  task: FileText,
  note: StickyNote,
  journal: BookOpen,
  event: Archive,
  person: Archive,
  quote: Archive,
  routine: Archive,
  food: Utensils,
  habit: Repeat,
};

const STATUS_LABEL = {
  pending: 'Pending',
  triaged: 'Triaged',
  dismissed: 'Dismissed',
} as const;

const STATUS_CLASS = {
  pending: 'bg-primary-soft text-primary',
  triaged: 'bg-bg-sunken text-muted-foreground',
  dismissed: 'bg-bg-rail text-subtle-foreground',
} as const;

type CaptureFilter = 'all' | Capture['status'];

const CAPTURE_FILTERS: Array<{ id: CaptureFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'triaged', label: 'Triaged' },
  { id: 'dismissed', label: 'Dismissed' },
];

function relativeTime(iso: string): string {
  return relativeTimeLabel(iso) ?? '';
}

/* ------------------------------------------------------------------ */
/* Row                                                                  */
/* ------------------------------------------------------------------ */

function CaptureRow({ cap }: { cap: Capture }) {
  const routeLabel = cap.routedTo
    ? `to ${KIND_LABEL[cap.routedTo.type] ?? cap.routedTo.type}`
    : null;

  // The row's own heading, so each action names the capture it acts on rather
  // than repeating a bare verb for every row in the list.
  const captureLabel = cap.aiSummary ?? cap.raw;

  const KindIcon = cap.aiKind ? KIND_ICON[cap.aiKind] : FileText;

  return (
    <li className="surface-flat group flex items-start gap-2.5 px-3 py-3 sm:gap-3 sm:px-4">
      {/* Icon */}
      <span className="bg-bg-sunken text-subtle-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md">
        <KindIcon className="size-4" aria-hidden />
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-medium">{cap.aiSummary ?? cap.raw}</p>
        {cap.aiSummary && cap.aiSummary !== cap.raw ? (
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{cap.raw}</p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {/* Status chip */}
          <span
            className={cn(
              'rounded-md px-2 py-0.5 text-[10px] font-semibold',
              STATUS_CLASS[cap.status],
            )}
          >
            {STATUS_LABEL[cap.status]}
          </span>

          {/* Route chip */}
          {routeLabel ? (
            <span className="bg-bg-sunken text-muted-foreground rounded-md px-2 py-0.5 text-[10px]">
              {routeLabel}
            </span>
          ) : null}

          {/* Source chip */}
          <span className="text-subtle-foreground font-mono text-[10px] tracking-[0.12em] uppercase">
            via {cap.source}
          </span>

          {/* Time */}
          <span className="text-subtle-foreground ml-auto font-mono text-[10px]">
            {relativeTime(cap.createdAt)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        {cap.status !== 'dismissed' ? (
          <button
            type="button"
            title="Dismiss"
            aria-label={`Dismiss capture: ${captureLabel}`}
            onClick={() => dismissCapture(cap.id)}
            className="text-subtle-foreground hover:bg-bg-sunken hover:text-foreground flex size-10 items-center justify-center rounded-md sm:size-8"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          title="Delete"
          aria-label={`Delete capture: ${captureLabel}`}
          onClick={() => deleteCapture(cap.id)}
          className="text-subtle-foreground hover:bg-destructive/10 hover:text-destructive flex size-10 items-center justify-center rounded-md sm:size-8"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function InboxPage() {
  const openWorkLogger = useAppStore((state) => state.openWorkLogger);
  const [filter, setFilter] = useState<CaptureFilter>('pending');
  const captures = useLiveQuery(async () => {
    const db = getDb();
    const all = await db.captures.toArray();
    return all.filter((c) => !c.deletedAt).sort(compareCaptureRecency);
  });

  const pending = captures?.filter((c) => c.status === 'pending').length ?? 0;
  const visibleCaptures = captures?.filter(
    (capture) => filter === 'all' || capture.status === filter,
  );

  const meta =
    pending > 0 ? (
      <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-mono text-[10px]">
        {pending} pending
      </span>
    ) : null;

  return (
    <ViewShell
      eyebrow="Plan"
      title="Inbox"
      subtitle="Review captured work, route it, and keep the queue clear."
      meta={meta}
      compactHeader
      fullWidth
    >
      {captures === undefined ? (
        <SkeletonRows />
      ) : captures.length === 0 ? (
        <EmptyState onCapture={() => openWorkLogger('task')} />
      ) : (
        <div className="flex flex-col gap-3">
          <div
            role="group"
            aria-label="Inbox status"
            className="bg-bg-sunken grid grid-cols-4 gap-0.5 rounded-lg border p-0.5 sm:w-fit"
          >
            {CAPTURE_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={cn(
                  'min-h-10 rounded-md px-2 text-[11px] font-medium transition-colors sm:min-h-8 sm:px-3 sm:text-xs',
                  filter === item.id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          {visibleCaptures?.length ? (
            <ul className="flex flex-col gap-2">
              {visibleCaptures.map((cap) => (
                <CaptureRow key={cap.id} cap={cap} />
              ))}
            </ul>
          ) : (
            <div className="text-muted-foreground flex min-h-32 items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm">
              No {filter} captures.
            </div>
          )}
        </div>
      )}
    </ViewShell>
  );
}

function SkeletonRows() {
  return (
    <ul className="flex flex-col gap-2" aria-label="Loading">
      {[1, 2, 3].map((i) => (
        <li key={i} className="surface-flat bg-bg-sunken h-16 animate-pulse" />
      ))}
    </ul>
  );
}

function EmptyState({ onCapture }: { onCapture: () => void }) {
  return (
    <div className="surface flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center">
      <span className="bg-bg-sunken text-subtle-foreground flex size-9 items-center justify-center rounded-lg">
        <Inbox className="size-4" aria-hidden />
      </span>
      <p className="text-foreground text-sm font-semibold">Inbox cleared</p>
      <p className="text-muted-foreground max-w-xs text-xs">
        Capture the next task before it gets lost.
      </p>
      <button
        type="button"
        onClick={onCapture}
        className="bg-primary text-primary-foreground mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-4 text-xs font-semibold"
      >
        <Plus className="size-3.5" aria-hidden />
        Capture task
      </button>
    </div>
  );
}
