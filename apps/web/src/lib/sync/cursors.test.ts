import { describe, expect, it } from 'vitest';
import { overlappedCursor, parseSyncCursors, SYNC_EPOCH } from './cursors';

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
});

describe('overlappedCursor', () => {
  it('subtracts the overlap from a valid cursor', () => {
    expect(overlappedCursor('2026-07-15T12:00:00.000Z', 120_000)).toBe(
      '2026-07-15T11:58:00.000Z',
    );
  });

  it('keeps the epoch and recovers malformed timestamps', () => {
    expect(overlappedCursor(SYNC_EPOCH, 120_000)).toBe(SYNC_EPOCH);
    expect(overlappedCursor('not-a-date', 120_000)).toBe(SYNC_EPOCH);
  });
});
