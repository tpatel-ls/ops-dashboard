import { describe, expect, it } from 'vitest';
import { isoDay, localDay, toISODate } from './dates';

describe('localDay', () => {
  it('preserves date-only calendar values', () => {
    expect(localDay('2026-08-01')).toBe('2026-08-01');
  });

  it('uses the runtime local day for timestamps', () => {
    const timestamp = '2026-08-01T00:30:00+14:00';
    expect(localDay(timestamp)).toBe(isoDay(new Date(timestamp)));
  });

  it('rejects invalid timestamps', () => {
    expect(localDay('not-a-date')).toBeUndefined();
  });

  it('rejects impossible date-only calendar values', () => {
    expect(localDay('2026-02-29')).toBeUndefined();
    expect(localDay('2026-13-01')).toBeUndefined();
    expect(localDay('2028-02-29')).toBe('2028-02-29');
  });
});

describe('toISODate', () => {
  it('formats dates in local calendar terms', () => {
    expect(toISODate(new Date(Date.UTC(2026, 6, 30, 12, 0, 0)))).toBe('2026-07-30');
    expect(toISODate(new Date(2026, 0, 1))).toBe('2026-01-01');
  });
});
