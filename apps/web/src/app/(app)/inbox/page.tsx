'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { formatDistanceToNow, parseISO } from 'date-fns';
import {
  Archive,
  BookOpen,
  FileText,
  Inbox,
  Repeat,
  StickyNote,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import type { Capture, CaptureKind } from '@ops-dashboard/core';
import { dismissCapture, deleteCapture } from '@/lib/captures';
import { ViewShell } from '@/components/view-shell';
import { cn } from '@ops-dashboard/ui';

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

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

/* ------------------------------------------------------------------ */
/* Row                                                                  */
/* ------------------------------------------------------------------ */

function CaptureRow({ cap }: { cap: Capture }) {
  const routeLabel =
    cap.routedTo ? `to ${KIND_LABEL[cap.routedTo.type] ?? cap.routedTo.type}` : null;

  const KindIcon = cap.aiKind ? KIND_ICON[cap.aiKind] : FileText;

  return (
    <li className="surface-flat group flex items-start gap-3 rounded-[14px] px-4 py-3">
      {/* Icon */}
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-bg-sunken text-subtle-foreground">
        <KindIcon className="size-4" aria-hidden />
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {cap.aiSummary ?? cap.raw}
        </p>
        {cap.aiSummary && cap.aiSummary !== cap.raw ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{cap.raw}</p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {/* Status chip */}
          <span
            className={cn(
              'rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]',
              STATUS_CLASS[cap.status],
            )}
          >
            {STATUS_LABEL[cap.status]}
          </span>

          {/* Route chip */}
          {routeLabel ? (
            <span className="rounded-full bg-bg-sunken px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {routeLabel}
            </span>
          ) : null}

          {/* Source chip */}
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle-foreground">
            via {cap.source}
          </span>

          {/* Time */}
          <span className="ml-auto font-mono text-[10px] text-subtle-foreground">
            {relativeTime(cap.createdAt)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {cap.status !== 'dismissed' ? (
          <button
            type="button"
            title="Dismiss"
            onClick={() => dismissCapture(cap.id)}
            className="flex size-7 items-center justify-center rounded-md text-subtle-foreground hover:bg-bg-sunken hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          title="Delete"
          onClick={() => deleteCapture(cap.id)}
          className="flex size-7 items-center justify-center rounded-md text-subtle-foreground hover:bg-destructive/10 hover:text-destructive"
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
  const captures = useLiveQuery(async () => {
    const db = getDb();
    const all = await db.captures.toArray();
    return all
      .filter((c) => !c.deletedAt)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  });

  const pending = captures?.filter((c) => c.status === 'pending').length ?? 0;

  const meta = pending > 0 ? (
    <span className="rounded-full bg-primary px-2 py-0.5 font-mono text-[10px] text-primary-foreground">
      {pending} pending
    </span>
  ) : null;

  return (
    <ViewShell
      eyebrow="Plan"
      title="Inbox"
      subtitle="Everything you captured — review, route, and clear."
      meta={meta}
    >
      {captures === undefined ? (
        <SkeletonRows />
      ) : captures.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col gap-2">
          {captures.map((cap) => (
            <CaptureRow key={cap.id} cap={cap} />
          ))}
        </ul>
      )}
    </ViewShell>
  );
}

function SkeletonRows() {
  return (
    <ul className="flex flex-col gap-2" aria-label="Loading">
      {[1, 2, 3].map((i) => (
        <li key={i} className="surface-flat h-16 animate-pulse rounded-[14px] bg-bg-sunken" />
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <span className="flex size-12 items-center justify-center rounded-[14px] bg-bg-sunken text-subtle-foreground">
        <Inbox className="size-6" aria-hidden />
      </span>
      <p className="text-sm font-medium text-foreground">A clean slate.</p>
      <p className="max-w-xs text-xs text-muted-foreground">
        Nothing in your capture inbox. Use the quick-add bar or press{' '}
        <kbd className="kbd">Space</kbd> to start capturing thoughts.
      </p>
    </div>
  );
}
