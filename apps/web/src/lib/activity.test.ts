import { describe, expect, it } from 'vitest';
import { aggregateActivity } from './activity';

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
