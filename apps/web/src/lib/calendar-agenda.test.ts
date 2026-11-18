import { describe, expect, it } from 'vitest';
import { isoDay } from '@ops-dashboard/core';
import type { Task } from '@ops-dashboard/core';
import {
  CALENDAR_START_HOUR,
  calendarDateOf,
  calendarGridMinutes,
  calendarGridSlot,
  calendarInstant,
  calendarKindOf,
  compareCalendarTasks,
} from './calendar-agenda';

function task(id: string, patch: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    status: 'todo',
    priority: 0,
    tags: [],
    reminders: [],
    checklist: [],
    order: 0,
    createdAt: '2026-07-18T12:00:00.000Z',
    updatedAt: '2026-07-18T12:00:00.000Z',
    version: 1,
    deviceId: 'test',
    ...patch,
  };
}

describe('calendar agenda', () => {
  it('ignores malformed date fields when choosing a calendar day', () => {
    expect(
      calendarDateOf(task('invalid', { dueAt: 'not-a-date', scheduledFor: '2026-02-30' })),
    ).toBeUndefined();
  });
  it('places time blocks, scheduled tasks, and due tasks on a calendar date', () => {
    expect(calendarDateOf(task('block', { startAt: '2026-07-20T09:00:00' }))).toBe('2026-07-20');
    expect(calendarDateOf(task('scheduled', { scheduledFor: '2026-07-21' }))).toBe('2026-07-21');
    expect(calendarDateOf(task('due', { dueAt: '2026-07-22T17:00:00.000Z' }))).toBe('2026-07-22');
    expect(calendarDateOf(task('inbox'))).toBeUndefined();
  });

  it('uses the most specific calendar kind', () => {
    expect(
      calendarKindOf(task('block', { startAt: '2026-07-20T09:00:00', scheduledFor: '2026-07-20' })),
    ).toBe('time-block');
    expect(
      calendarKindOf(task('scheduled', { scheduledFor: '2026-07-20', dueAt: '2026-07-20' })),
    ).toBe('scheduled');
    expect(calendarKindOf(task('due', { dueAt: '2026-07-20' }))).toBe('due');
  });

  it('places timestamped tasks on the browser-local calendar day', () => {
    const timestamp = '2026-07-20T00:30:00+14:00';

    expect(calendarDateOf(task('block', { startAt: timestamp }))).toBe(isoDay(new Date(timestamp)));
    expect(calendarDateOf(task('due', { dueAt: timestamp }))).toBe(isoDay(new Date(timestamp)));
  });

  it('preserves date-only deadlines in negative UTC offsets', () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = 'America/Chicago';
    try {
      expect(calendarDateOf(task('due', { dueAt: '2026-07-20' }))).toBe('2026-07-20');
    } finally {
      process.env.TZ = originalTimezone;
    }
  });

  it('preserves date-only start days in negative UTC offsets', () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = 'America/Chicago';
    try {
      expect(calendarDateOf(task('block', { startAt: '2026-07-20' }))).toBe('2026-07-20');
    } finally {
      process.env.TZ = originalTimezone;
    }
  });

  it('falls back to a scheduled day when a date-only start is impossible', () => {
    const impossible = task('impossible-start', {
      startAt: '2026-02-30',
      scheduledFor: '2026-07-20',
    });

    expect(calendarDateOf(impossible)).toBe('2026-07-20');
  });

  it('does not place malformed scheduled days on the calendar', () => {
    expect(calendarDateOf(task('impossible', { scheduledFor: '2026-02-30' }))).toBeUndefined();
    expect(
      calendarDateOf(task('trailing', { scheduledFor: '2026-07-20 ignore this' })),
    ).toBeUndefined();
  });

  it('does not normalize impossible date-only deadlines onto another day', () => {
    const impossible = task('impossible-due', { dueAt: '2026-02-30' });

    expect(calendarDateOf(impossible)).toBeUndefined();
    expect(calendarKindOf(impossible)).toBeUndefined();
    expect(calendarInstant(impossible.dueAt)).toBeUndefined();
  });

  it('falls back to a valid scheduled day when a time block is malformed', () => {
    const fallback = task('fallback', { startAt: 'not-a-date', scheduledFor: '2026-07-20' });

    expect(calendarDateOf(fallback)).toBe('2026-07-20');
    expect(calendarKindOf(fallback)).toBe('scheduled');
  });

  it('returns dates only for valid calendar instants', () => {
    expect(calendarInstant('2026-07-20T09:00:00.000Z')?.toISOString()).toBe(
      '2026-07-20T09:00:00.000Z',
    );
    expect(calendarInstant('not-a-date')).toBeUndefined();
    expect(calendarInstant(undefined)).toBeUndefined();
  });

  it('parses date-only calendar instants at midnight UTC', () => {
    expect(calendarInstant('2026-07-20')?.toISOString()).toBe('2026-07-20T00:00:00.000Z');
  });

  it('breaks an identical start time by priority, then title, then id', () => {
    const at = '2026-07-20T09:00:00';
    const lowZebra = task('b-low', { startAt: at, priority: 0, title: 'Zebra' });
    const highAlpha = task('a-high', { startAt: at, priority: 3, title: 'Alpha' });

    expect([lowZebra, highAlpha].sort(compareCalendarTasks).map((item) => item.id)).toEqual([
      'a-high',
      'b-low',
    ]);
    // A comparator must be antisymmetric: reversing the arguments must reverse
    // the sign, or the sorted order depends on the input order.
    expect(Math.sign(compareCalendarTasks(lowZebra, highAlpha))).toBe(
      -Math.sign(compareCalendarTasks(highAlpha, lowZebra)),
    );
  });

  it('sorts timed work first, followed by priority and title', () => {
    const items = [
      task('normal', { scheduledFor: '2026-07-20', title: 'Normal' }),
      task('critical', { scheduledFor: '2026-07-20', priority: 3, title: 'Critical' }),
      task('later', { startAt: '2026-07-20T14:00:00', title: 'Later' }),
      task('early', { startAt: '2026-07-20T09:00:00', title: 'Early' }),
      task('invalid', { startAt: 'not-a-date', scheduledFor: '2026-07-20', priority: 2 }),
    ];

    expect(items.sort(compareCalendarTasks).map((item) => item.id)).toEqual([
      'early',
      'later',
      'critical',
      'invalid',
      'normal',
    ]);
  });

  it('uses the task id as a final deterministic tie breaker', () => {
    const alpha = task('a', { title: 'Same' });
    const bravo = task('b', { title: 'Same' });
    expect(compareCalendarTasks(alpha, bravo)).toBeLessThan(0);
  });

  it('keeps sorting when synced labels are malformed', () => {
    const malformed = task('malformed', { title: null as never });
    const valid = task('valid', { title: 'Review' });

    expect([valid, malformed].sort(compareCalendarTasks).map((item) => item.id)).toEqual([
      'malformed',
      'valid',
    ]);
  });

  it('orders simultaneous time blocks deterministically', () => {
    const items = [
      task('bravo', { startAt: '2026-07-20T09:00:00', title: 'Review' }),
      task('alpha', { startAt: '2026-07-20T09:00:00', title: 'Review' }),
      task('priority', {
        startAt: '2026-07-20T09:00:00',
        priority: 3,
        title: 'Urgent review',
      }),
    ];

    expect(items.sort(compareCalendarTasks).map((item) => item.id)).toEqual([
      'priority',
      'alpha',
      'bravo',
    ]);
  });

  it('sorts higher priority untimed tasks first', () => {
    expect(
      [task('low', { priority: 0 }), task('high', { priority: 3 })]
        .sort(compareCalendarTasks)
        .map((item) => item.id),
    ).toEqual(['high', 'low']);
  });

  it('treats malformed priorities as the default priority', () => {
    const malformed = task('malformed', { priority: Number.NaN as never });
    const normal = task('normal', { priority: 0 });
    const urgent = task('urgent', { priority: 3 });

    expect([urgent, normal, malformed].sort(compareCalendarTasks).map((item) => item.id)).toEqual([
      'urgent',
      'malformed',
      'normal',
    ]);
  });
});

describe('calendarGridSlot', () => {
  it('places a block in its own hour row at its minute offset', () => {
    expect(calendarGridSlot(new Date(2026, 9, 29, 14, 45))).toEqual({ hour: 14, minute: 45 });
  });

  it('pins a block that starts before the first row to the top of the grid', () => {
    // Before this, a 05:30 block matched no row and was not drawn at all.
    expect(calendarGridSlot(new Date(2026, 9, 29, 5, 30))).toEqual({
      hour: CALENDAR_START_HOUR,
      minute: 0,
    });
    expect(calendarGridSlot(new Date(2026, 9, 29, 0, 0))).toEqual({
      hour: CALENDAR_START_HOUR,
      minute: 0,
    });
  });

  it('keeps the last hour row for a late-evening block', () => {
    expect(calendarGridSlot(new Date(2026, 9, 29, 23, 15))).toEqual({ hour: 23, minute: 15 });
  });
});

describe('calendarGridMinutes', () => {
  const at = (hour: number, minute = 0) => new Date(2026, 10, 16, hour, minute);

  it('covers the block from its start to its end', () => {
    expect(calendarGridMinutes(at(9), at(10, 30))).toBe(90);
  });

  it('measures a pinned early block from the top of the grid', () => {
    // Drawn from 06:00, a 05:00 to 07:00 block must end at 07:00, not 08:00.
    expect(calendarGridMinutes(at(5), at(7))).toBe(60);
    expect(calendarGridMinutes(at(0), at(CALENDAR_START_HOUR, 45))).toBe(45);
  });

  it('stops a block that runs past the last row at the bottom of the grid', () => {
    const nextDay = (hour: number) => new Date(2026, 10, 17, hour);

    // The last row is 23:00, so the grid ends at midnight.
    expect(calendarGridMinutes(at(23), nextDay(1))).toBe(60);
    expect(calendarGridMinutes(at(22, 30), nextDay(2))).toBe(90);
    // A block spanning days draws to the end of its first day only.
    expect(calendarGridMinutes(at(9), new Date(2026, 10, 19, 17))).toBe(15 * 60);
  });

  it('keeps a minimum height and a default for an open-ended block', () => {
    expect(calendarGridMinutes(at(5), at(5, 30))).toBe(15);
    expect(calendarGridMinutes(at(9), at(9, 5))).toBe(15);
    expect(calendarGridMinutes(at(9), undefined)).toBe(30);
  });
});
