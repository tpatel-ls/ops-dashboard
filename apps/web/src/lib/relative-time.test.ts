import { afterEach, describe, expect, it, vi } from 'vitest';
import { relativeTimeLabel } from './relative-time';

afterEach(() => {
  vi.useRealTimers();
});

describe('relativeTimeLabel', () => {
  it('describes a past timestamp relative to now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-28T12:00:00.000Z'));

    expect(relativeTimeLabel('2026-07-25T12:00:00.000Z')).toBe('3 days ago');
  });

  it('describes a future timestamp with a forward suffix', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-28T12:00:00.000Z'));

    expect(relativeTimeLabel('2026-07-31T12:00:00.000Z')).toBe('in 3 days');
  });

  it('accepts a date-only value', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-28T12:00:00.000Z'));

    expect(relativeTimeLabel('2026-07-28')).toBeTypeOf('string');
  });

  it('returns undefined for a missing value', () => {
    expect(relativeTimeLabel(undefined)).toBeUndefined();
    expect(relativeTimeLabel('')).toBeUndefined();
  });

  it('returns undefined instead of throwing on an unparseable value', () => {
    for (const value of ['not-a-date', '2026-13-01', '2026-02-30', 'null']) {
      expect(() => relativeTimeLabel(value)).not.toThrow();
      expect(relativeTimeLabel(value)).toBeUndefined();
    }
  });
});
