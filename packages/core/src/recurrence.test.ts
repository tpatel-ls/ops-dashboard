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

  it('handles monthly', () => {
    const next = nextOccurrence({ freq: 'monthly', interval: 1 }, new Date('2026-04-26'));
    expect(next.toISOString().slice(0, 10)).toBe('2026-05-26');
  });
});
