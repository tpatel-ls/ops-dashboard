import { describe, expect, it } from 'vitest';
import { shortDayLabel } from './calendar-label';

describe('shortDayLabel', () => {
  it('omits the year for a day in the current year', () => {
    expect(shortDayLabel('2026-03-03', '2026-11-19')).toBe('Mar 3');
  });

  it('includes the year for a day in another year', () => {
    expect(shortDayLabel('2025-03-03', '2026-11-19')).toBe('Mar 3, 2025');
    expect(shortDayLabel('2027-01-04', '2026-11-19')).toBe('Jan 4, 2027');
  });

  it('keeps the year when today is not a calendar day', () => {
    expect(shortDayLabel('2026-03-03', 'not-a-day')).toBe('Mar 3, 2026');
  });
});
