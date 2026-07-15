import { describe, expect, it } from 'vitest';
import { parseSyncCursors } from './cursors';

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
