import { describe, expect, it } from 'vitest';
import {
  activityTimestampOnOrAfter,
  aggregateActivity,
  normalizeActivityDays,
  workLogActivityContribution,
} from './activity';

describe('aggregateActivity', () => {
  it('normalizes invalid and negative scores to an empty day', () => {
    const result = aggregateActivity(
      new Map([
        ['2026-07-27', Number.NaN],
        ['2026-07-28', -3],
        ['2026-07-29', Number.POSITIVE_INFINITY],
      ]),
      new Date(2026, 6, 27, 12),
      new Date(2026, 6, 29, 12),
    );

    expect(result).toEqual([
      { date: '2026-07-27', count: 0, level: 0 },
      { date: '2026-07-28', count: 0, level: 0 },
      { date: '2026-07-29', count: 0, level: 0 },
    ]);
  });

  it('preserves valid fractional activity contributions', () => {
    const result = aggregateActivity(
      new Map([['2026-07-29', 2.5]]),
      new Date(2026, 6, 29, 12),
      new Date(2026, 6, 29, 12),
    );

    expect(result).toEqual([{ date: '2026-07-29', count: 2.5, level: 1 }]);
  });
});

describe('normalizeActivityDays', () => {
  it('bounds history windows to a positive ten-year range', () => {
    expect(normalizeActivityDays(0)).toBe(1);
    expect(normalizeActivityDays(30.9)).toBe(30);
    expect(normalizeActivityDays(50_000)).toBe(3660);
  });

  it('falls back for non-finite history windows', () => {
    expect(normalizeActivityDays(Number.NaN)).toBe(365);
    expect(normalizeActivityDays(Number.POSITIVE_INFINITY)).toBe(365);
  });
});

describe('workLogActivityContribution', () => {
  it('scores valid work durations', () => {
    expect(workLogActivityContribution(30)).toBe(0.5);
    expect(workLogActivityContribution(90)).toBe(1.5);
  });

  it.each([0, -30, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    'ignores malformed legacy duration %s',
    (minutes) => {
      expect(workLogActivityContribution(minutes)).toBe(0);
    },
  );
});

describe('activityTimestampOnOrAfter', () => {
  const start = new Date('2026-08-01T00:00:00.000Z');

  it('compares offset timestamps by instant instead of source text', () => {
    expect(activityTimestampOnOrAfter('2026-08-01T01:00:00+14:00', start)).toBe(false);
    expect(activityTimestampOnOrAfter('2026-07-31T23:30:00-05:00', start)).toBe(true);
  });

  it('rejects malformed timestamps and invalid range starts', () => {
    expect(activityTimestampOnOrAfter('not-a-date', start)).toBe(false);
    expect(activityTimestampOnOrAfter('2026-08-01T12:00:00Z', new Date('invalid'))).toBe(false);
  });
});
