'use client';

import { useSyncStatus, type SyncState } from '@/lib/sync/status';

const META: Record<SyncState, { label: string; color: string }> = {
  off: { label: 'Device only', color: 'var(--color-muted-foreground)' },
  unconfigured: { label: 'Sync unavailable', color: 'var(--color-muted-foreground)' },
  'signed-out': { label: 'Sign in to sync', color: 'var(--color-warning)' },
  connecting: { label: 'Connecting', color: 'var(--color-warning)' },
  live: { label: 'Synced', color: 'var(--color-success)' },
  // The pending badge says how much is queued. Putting "queued" in the label
  // too claimed queued changes when there were none and read "Offline, queued
  // 3 queued" when there were.
  offline: { label: 'Offline', color: 'var(--color-warning)' },
  error: { label: 'Sync needs attention', color: 'var(--color-destructive)' },
};

export function SyncStatus({ showPending = true }: { showPending?: boolean }) {
  const state = useSyncStatus((s) => s.state);
  const pending = useSyncStatus((s) => s.pending);
  const meta = META[state];

  return (
    <span
      role="status"
      aria-live="polite"
      title={meta.label}
      className="bg-card text-muted-foreground inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs"
    >
      <span
        className={state === 'live' ? 'live-dot size-1.5 rounded-full' : 'size-1.5 rounded-full'}
        style={{ background: meta.color }}
      />
      {meta.label}
      {showPending && pending > 0 ? (
        <span className="bg-bg-sunken text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[10px] tabular-nums">
          {pending} queued
        </span>
      ) : null}
    </span>
  );
}
