import { describe, expect, it } from 'vitest';
import { isoDay, localDay, monthGrid, toISODate, weekDays, weekStartIso } from './dates';

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

describe('weekStartIso', () => {
  // 2026-09-16 is a Wednesday.
  const wednesday = new Date(2026, 8, 16, 12, 0, 0);

  it('starts the week on Monday when weekStartsOn is 1', () => {
    expect(weekStartIso(1, wednesday)).toBe('2026-09-14');
  });

  it('starts the week on Sunday when weekStartsOn is 0', () => {
    expect(weekStartIso(0, wednesday)).toBe('2026-09-13');
  });

  it('keeps a Sunday anchor in its own week for each setting', () => {
    const sunday = new Date(2026, 8, 13, 12, 0, 0);

    expect(weekStartIso(0, sunday)).toBe('2026-09-13');
    expect(weekStartIso(1, sunday)).toBe('2026-09-07');
  });
});

describe('weekDays', () => {
  // 2026-09-16 is a Wednesday.
  const wednesday = new Date(2026, 8, 16, 12, 0, 0);

  it('returns the seven days of the week containing the anchor', () => {
    expect(weekDays(wednesday, 1).map(isoDay)).toEqual([
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
      '2026-09-18',
      '2026-09-19',
      '2026-09-20',
    ]);
  });

  it('honours a Sunday week start', () => {
    const days = weekDays(wednesday, 0).map(isoDay);

    expect(days).toHaveLength(7);
    expect(days[0]).toBe('2026-09-13');
    expect(days[6]).toBe('2026-09-19');
  });

  it('agrees with weekStartIso on the first day', () => {
    for (const weekStartsOn of [0, 1] as const) {
      expect(isoDay(weekDays(wednesday, weekStartsOn)[0]!)).toBe(
        weekStartIso(weekStartsOn, wednesday),
      );
    }
  });
});

describe('monthGrid', () => {
  it('covers whole weeks that span the anchor month', () => {
    const days = monthGrid(new Date(2026, 8, 16, 12, 0, 0), 1).map(isoDay);

    // September 2026 starts on a Tuesday and ends on a Wednesday, so a
    // Monday-start grid runs 2026-08-31 through 2026-10-04.
    expect(days[0]).toBe('2026-08-31');
    expect(days.at(-1)).toBe('2026-10-04');
    expect(days).toHaveLength(35);
  });

  it('always returns a whole number of weeks', () => {
    for (let month = 0; month < 12; month += 1) {
      for (const weekStartsOn of [0, 1] as const) {
        const days = monthGrid(new Date(2026, month, 15, 12, 0, 0), weekStartsOn);

        expect(days.length % 7).toBe(0);
        expect(days[0]!.getDay()).toBe(weekStartsOn);
      }
    }
  });

  it('shifts the grid when the week starts on Sunday', () => {
    const days = monthGrid(new Date(2026, 8, 16, 12, 0, 0), 0).map(isoDay);

    expect(days[0]).toBe('2026-08-30');
    expect(days.at(-1)).toBe('2026-10-03');
  });

  it('returns consecutive calendar days across a daylight saving boundary', () => {
    // US DST ends on 2026-11-01; an hour-based cursor would repeat that day.
    const days = monthGrid(new Date(2026, 10, 15, 12, 0, 0), 0).map(isoDay);

    expect(new Set(days).size).toBe(days.length);
    expect(days).toContain('2026-11-01');
    expect(days).toContain('2026-11-02');
  });
});
