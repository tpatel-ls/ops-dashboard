import { describe, expect, it } from 'vitest';
import { longDayLabel, shortDayLabel, weekRangeLabel, weekdayChipLabel } from './calendar-label';

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

describe('longDayLabel', () => {
  it('omits the year for a day in the current year', () => {
    expect(longDayLabel('2026-11-20', '2026-11-20')).toBe('Friday, Nov 20');
  });

  it('includes the year for a day in another year', () => {
    expect(longDayLabel('2025-11-20', '2026-11-20')).toBe('Thursday, Nov 20, 2025');
  });

  it('keeps the year when today is not a calendar day', () => {
    expect(longDayLabel('2026-11-20', '')).toBe('Friday, Nov 20, 2026');
  });
});

describe('weekdayChipLabel', () => {
  it('omits the year for a day in the current year', () => {
    expect(weekdayChipLabel('2026-03-03', '2026-11-25')).toBe('Tue 3 Mar');
  });

  it('includes the year for a day in another year', () => {
    expect(weekdayChipLabel('2025-03-03', '2026-11-25')).toBe('Mon 3 Mar 2025');
  });
});

describe('weekRangeLabel', () => {
  it('names the year once for a week inside one year', () => {
    expect(weekRangeLabel(new Date(2026, 10, 16), new Date(2026, 10, 22))).toBe(
      'Nov 16 to Nov 22, 2026',
    );
  });

  it('names both years for a week that crosses into the next', () => {
    expect(weekRangeLabel(new Date(2026, 11, 28), new Date(2027, 0, 3))).toBe(
      'Dec 28, 2026 to Jan 3, 2027',
    );
  });
});
