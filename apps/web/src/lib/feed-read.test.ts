import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppNotification } from '@ops-dashboard/core';

const mocks = vi.hoisted(() => ({
  rows: [] as AppNotification[],
  patchRecord: vi.fn(),
}));

vi.mock('@ops-dashboard/core', async () => {
  const actual = await vi.importActual<typeof import('@ops-dashboard/core')>('@ops-dashboard/core');
  return {
    ...actual,
    getDb: () => ({
      notifications: {
        filter: (predicate: (row: AppNotification) => boolean) => ({
          toArray: () => Promise.resolve(mocks.rows.filter(predicate)),
        }),
      },
    }),
  };
});

vi.mock('./records', () => ({
  newRecord: vi.fn(),
  putRecord: vi.fn(),
  patchRecord: mocks.patchRecord,
}));

import { markAllNotificationsRead } from './feed';

function notification(overrides: Partial<AppNotification>): AppNotification {
  return {
    id: 'n1',
    title: 'Capture routed',
    kind: 'capture',
    createdAt: '2026-09-25T10:00:00.000Z',
    updatedAt: '2026-09-25T10:00:00.000Z',
    version: 1,
    deviceId: 'device-1',
    ...overrides,
  } as AppNotification;
}

describe('markAllNotificationsRead', () => {
  beforeEach(() => {
    mocks.patchRecord.mockReset().mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks only the rows that are unread and not deleted', async () => {
    mocks.rows = [
      notification({ id: 'unread-1' }),
      notification({ id: 'already-read', readAt: '2026-09-25T09:00:00.000Z' }),
      notification({ id: 'deleted', deletedAt: '2026-09-25T09:30:00.000Z' }),
      notification({ id: 'unread-2' }),
      // A row that is both read and deleted must not be touched twice over.
      notification({
        id: 'read-and-deleted',
        readAt: '2026-09-25T09:00:00.000Z',
        deletedAt: '2026-09-25T09:30:00.000Z',
      }),
    ];

    await markAllNotificationsRead();

    expect(mocks.patchRecord.mock.calls.map((call) => call[1])).toEqual(['unread-1', 'unread-2']);
    expect(mocks.patchRecord).toHaveBeenCalledTimes(2);
    for (const call of mocks.patchRecord.mock.calls) {
      expect(call[0]).toBe('notifications');
    }
  });

  it('stamps every row it marks with one shared timestamp', async () => {
    mocks.rows = [notification({ id: 'a' }), notification({ id: 'b' }), notification({ id: 'c' })];
    // Advance the clock on every write so a per-row `new Date()` would produce
    // three different stamps. Without this the calls land in the same
    // millisecond and the assertion would pass either way.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-25T12:00:00.000Z'));
    mocks.patchRecord.mockImplementation(async () => {
      vi.advanceTimersByTime(1_000);
      return null;
    });

    await markAllNotificationsRead();

    // One "mark all" action should not leave the feed reporting staggered read
    // times for rows the user cleared together.
    const stamps = new Set(mocks.patchRecord.mock.calls.map((call) => call[2].readAt));
    expect(mocks.patchRecord).toHaveBeenCalledTimes(3);
    expect(stamps).toEqual(new Set(['2026-09-25T12:00:00.000Z']));
  });

  it('does nothing when every notification is already read', async () => {
    mocks.rows = [notification({ id: 'a', readAt: '2026-09-25T09:00:00.000Z' })];

    await markAllNotificationsRead();

    expect(mocks.patchRecord).not.toHaveBeenCalled();
  });
});
