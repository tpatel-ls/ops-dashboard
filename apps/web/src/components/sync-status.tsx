'use client';

import { useSyncStatus, type SyncState } from '@/lib/sync/status';

const META: Record<SyncState, { label: string; color: string }> = {
  off: { label: 'Device only', color: 'var(--color-muted-foreground)' },
  unconfigured: { label: 'Sync unavailable', color: 'var(--color-muted-foreground)' },
  'signed-out': { label: 'Sign in to sync', color: 'var(--color-warning)' },
  connecting: { label: 'Connecting', color: 'var(--color-warning)' },
  live: { label: 'Synced', color: 'var(--color-success)' },
  offline: { label: 'Offline, queued', color: 'var(--color-warning)' },
  error: { label: 'Sync needs attention', color: 'var(--color-destructive)' },
};

export function SyncStatus({ showPending = true }: { showPending?: boolean }) {
  const state = useSyncStatus((s) => s.state);
  const pending = useSyncStatus((s) => s.pending);
  const meta = META[state];

  return (
    <span role="status" aria-live="polite" title={meta.label} className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 text-xs text-muted-foreground">
      <span
        className={state === 'live' ? 'live-dot size-1.5 rounded-full' : 'size-1.5 rounded-full'}
        style={{ background: meta.color }}
      />
      {meta.label}
      {showPending && pending > 0 ? (
        <span className="rounded bg-bg-sunken px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
          {pending} queued
        </span>
      ) : null}
    </span>
  );
}
