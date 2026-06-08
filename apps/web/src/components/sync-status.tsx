'use client';

import { useSyncStatus, type SyncState } from '@/lib/sync/status';

const META: Record<SyncState, { label: string; color: string }> = {
  off: { label: 'Off', color: 'var(--color-muted-foreground)' },
  unconfigured: { label: 'Not configured', color: 'var(--color-muted-foreground)' },
  'signed-out': { label: 'Signed out', color: 'var(--color-warning)' },
  connecting: { label: 'Connecting…', color: 'var(--color-warning)' },
  live: { label: 'Live', color: 'var(--color-success)' },
  offline: { label: 'Offline — will sync', color: 'var(--color-warning)' },
  error: { label: 'Error', color: 'var(--color-destructive)' },
};

export function SyncStatus({ showPending = true }: { showPending?: boolean }) {
  const state = useSyncStatus((s) => s.state);
  const pending = useSyncStatus((s) => s.pending);
  const meta = META[state];

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
      <span
        className={state === 'live' ? 'live-dot size-1.5 rounded-full' : 'size-1.5 rounded-full'}
        style={{ background: meta.color }}
      />
      {meta.label}
      {showPending && pending > 0 ? (
        <span className="text-muted-foreground/70">· {pending} queued</span>
      ) : null}
    </span>
  );
}
