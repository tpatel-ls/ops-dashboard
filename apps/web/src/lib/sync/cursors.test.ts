import { describe, expect, it } from 'vitest';
import { createSyncCursorCache, overlappedCursor, parseSyncCursors, SYNC_EPOCH } from './cursors';

describe('parseSyncCursors', () => {
  it('returns an empty map for missing, malformed, or array storage', () => {
    expect(parseSyncCursors(null)).toEqual({});
    expect(parseSyncCursors('{broken')).toEqual({});
    expect(parseSyncCursors('["tasks"]')).toEqual({});
  });

  it('keeps only string cursor values from a stored object', () => {
    expect(
      parseSyncCursors(
        JSON.stringify({
          tasks: '2026-07-15T12:00:00.000Z',
          projects: 42,
          organizations: null,
        }),
      ),
    ).toEqual({ tasks: '2026-07-15T12:00:00.000Z' });
  });

  it('drops invalid timestamps and canonicalizes valid cursor instants', () => {
    expect(
      parseSyncCursors(
        JSON.stringify({
          tasks: 'not-a-date',
          projects: '2026-07-15T07:00:00-05:00',
        }),
      ),
    ).toEqual({ projects: '2026-07-15T12:00:00.000Z' });
  });
});

describe('createSyncCursorCache', () => {
  it('retains cursor progress when browser storage is unavailable', () => {
    const cache = createSyncCursorCache();
    const cursors = { tasks: '2026-07-15T12:00:00.000Z' };

    cache.store(cursors);

    expect(cache.read(null)).toEqual(cursors);
  });

  it('keeps the newest cursor from memory or persistent storage', () => {
    const cache = createSyncCursorCache();
    cache.store({ tasks: '2026-07-15T12:00:00.000Z' });

    expect(
      cache.read(JSON.stringify({ tasks: '2026-07-15T11:00:00.000Z', projects: '2026-07-16' })),
    ).toEqual({
      tasks: '2026-07-15T12:00:00.000Z',
      projects: '2026-07-16T00:00:00.000Z',
    });
  });

  it('does not regress or persist malformed cursor progress', () => {
    const cache = createSyncCursorCache();
    cache.store({ tasks: '2026-07-15T12:00:00.000Z' });

    expect(
      JSON.parse(
        cache.store({
          tasks: '2026-07-15T11:00:00.000Z',
          projects: 'not-a-date',
        }),
      ),
    ).toEqual({ tasks: '2026-07-15T12:00:00.000Z' });
  });
});

describe('overlappedCursor', () => {
  it('subtracts the overlap from a valid cursor', () => {
    expect(overlappedCursor('2026-07-15T12:00:00.000Z', 120_000)).toBe('2026-07-15T11:58:00.000Z');
  });

  it('keeps the epoch and recovers malformed timestamps', () => {
    expect(overlappedCursor(SYNC_EPOCH, 120_000)).toBe(SYNC_EPOCH);
    expect(overlappedCursor('not-a-date', 120_000)).toBe(SYNC_EPOCH);
  });

  it('never advances a cursor when given a malformed overlap', () => {
    const cursor = '2026-07-15T12:00:00.000Z';
    expect(overlappedCursor(cursor, -120_000)).toBe(cursor);
    expect(overlappedCursor(cursor, Number.NaN)).toBe(cursor);
  });
});
