import { beforeEach, describe, expect, it } from 'vitest';
import { setSyncStatus, useSyncStatus } from './status';

/**
 * The engine reports progress through `setSyncStatus` from outside React, and
 * every call it makes is a partial patch: `setSyncStatus({ state: 'live' })`
 * during a cycle must not disturb the pending count or the last-synced time
 * that the status UI reads alongside it.
 */
describe('setSyncStatus', () => {
  beforeEach(() => {
    useSyncStatus.setState({ state: 'off', pending: 0, lastSyncedAt: null, error: null });
  });

  it('starts off with nothing synced', () => {
    expect(useSyncStatus.getState()).toMatchObject({
      state: 'off',
      pending: 0,
      lastSyncedAt: null,
      error: null,
    });
  });

  it('leaves the fields a patch does not name untouched', () => {
    setSyncStatus({ pending: 4, lastSyncedAt: '2026-09-25T12:00:00.000Z' });
    setSyncStatus({ state: 'live' });

    expect(useSyncStatus.getState()).toMatchObject({
      state: 'live',
      pending: 4,
      lastSyncedAt: '2026-09-25T12:00:00.000Z',
    });
  });

  it('clears an error only when the patch says to', () => {
    setSyncStatus({ state: 'error', error: 'realtime' });
    expect(useSyncStatus.getState().error).toBe('realtime');

    // The engine pairs the recovery state with an explicit `error: null`.
    setSyncStatus({ state: 'offline' });
    expect(useSyncStatus.getState().error).toBe('realtime');

    setSyncStatus({ state: 'live', error: null });
    expect(useSyncStatus.getState().error).toBeNull();
  });

  it('notifies subscribers on each patch', () => {
    const seen: string[] = [];
    const unsubscribe = useSyncStatus.subscribe((s) => seen.push(s.state));

    setSyncStatus({ state: 'connecting' });
    setSyncStatus({ state: 'live' });
    unsubscribe();
    setSyncStatus({ state: 'offline' });

    expect(seen).toEqual(['connecting', 'live']);
  });
});
