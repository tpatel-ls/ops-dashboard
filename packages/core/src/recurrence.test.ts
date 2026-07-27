import { describe, expect, it } from 'vitest';
import { nextOccurrence } from './recurrence';

describe('nextOccurrence', () => {
  it('handles daily', () => {
    const next = nextOccurrence({ freq: 'daily', interval: 2 }, new Date('2026-04-26'));
    expect(next.toISOString().slice(0, 10)).toBe('2026-04-28');
  });

  it('handles weekly default', () => {
    const next = nextOccurrence({ freq: 'weekly', interval: 1 }, new Date('2026-04-26'));
    expect(next.toISOString().slice(0, 10)).toBe('2026-05-03');
  });

  it('handles weekly with byDay', () => {
    const sun = new Date('2026-04-26');
    const next = nextOccurrence({ freq: 'weekly', interval: 1, byDay: ['MO', 'WE', 'FR'] }, sun);
    expect(next.getDay()).toBe(1);
  });

  it('honors the interval when rolling weekly byDay rules into their next cycle', () => {
    const friday = new Date('2026-04-24T12:00:00');
    const next = nextOccurrence(
      { freq: 'weekly', interval: 2, byDay: ['MO', 'WE', 'FR'] },
      friday,
    );
    expect(next.getDay()).toBe(1);
    expect(next.getDate()).toBe(4);
    expect(next.getMonth()).toBe(4);
  });

  it('handles monthly', () => {
    const next = nextOccurrence({ freq: 'monthly', interval: 1 }, new Date('2026-04-26'));
    expect(next.toISOString().slice(0, 10)).toBe('2026-05-26');
  });

  it('normalizes malformed intervals instead of producing an invalid date', () => {
    const anchor = new Date('2026-04-26');
    expect(nextOccurrence({ freq: 'daily', interval: Number.NaN }, anchor)).toEqual(
      new Date('2026-04-27'),
    );
    expect(nextOccurrence({ freq: 'daily', interval: 2.9 }, anchor)).toEqual(
      new Date('2026-04-28'),
    );
  });
});
