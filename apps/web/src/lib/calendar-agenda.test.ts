import { describe, expect, it } from 'vitest';
import { isoDay } from '@ops-dashboard/core';
import type { Task } from '@ops-dashboard/core';
import {
  calendarDateOf,
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

  it('does not place malformed scheduled days on the calendar', () => {
    expect(calendarDateOf(task('impossible', { scheduledFor: '2026-02-30' }))).toBeUndefined();
    expect(
      calendarDateOf(task('trailing', { scheduledFor: '2026-07-20 ignore this' })),
    ).toBeUndefined();
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
});
