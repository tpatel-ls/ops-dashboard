import { describe, expect, it } from 'vitest';
import type { Task } from '@ops-dashboard/core';
import { railHourRange, tasksForTodayRail, validRailEnd } from './today-rail';

function task(id: string, startAt: string, patch: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    status: 'todo',
    priority: 0,
    startAt,
    tags: [],
    order: 0,
    reminders: [],
    checklist: [],
    createdAt: '2026-08-20T12:00:00.000Z',
    updatedAt: '2026-08-20T12:00:00.000Z',
    version: 1,
    deviceId: 'test',
    ...patch,
  };
}

describe('tasksForTodayRail', () => {
  it('uses local calendar days and ignores malformed or archived blocks', () => {
    const localMorning = new Date(2026, 7, 20, 9).toISOString();
    const otherDay = new Date(2026, 7, 19, 23).toISOString();

    expect(
      tasksForTodayRail(
        [
          task('local', localMorning),
          task('other', otherDay),
          task('malformed', '2026-08-20-not-a-time'),
          task('archived', localMorning, { status: 'archived' }),
        ],
        '2026-08-20',
      ).map((item) => item.id),
    ).toEqual(['local']);
  });

  it('sorts offset timestamps by instant instead of source text', () => {
    const earlier = task('earlier', '2026-08-20T09:00:00-05:00');
    const later = task('later', '2026-08-20T14:30:00Z');

    expect(tasksForTodayRail([later, earlier], '2026-08-20').map((item) => item.id)).toEqual([
      'earlier',
      'later',
    ]);
  });

  it('orders equal and malformed block positions deterministically', () => {
    const startAt = '2026-08-20T09:00:00-05:00';
    const later = task('z', startAt, { title: 'Review', order: Number.NaN });
    const earlier = task('a', startAt, { title: 'Review', order: Number.NaN });
    const positioned = task('positioned', startAt, { order: 2 });

    expect(
      tasksForTodayRail([later, earlier, positioned], '2026-08-20').map((item) => item.id),
    ).toEqual(['positioned', 'a', 'z']);
  });
});

describe('validRailEnd', () => {
  it('keeps only finite end times after the block starts', () => {
    expect(validRailEnd('2026-08-20T14:00:00Z', '2026-08-20T15:00:00Z')?.toISOString()).toBe(
      '2026-08-20T15:00:00.000Z',
    );
    expect(validRailEnd('2026-08-20T14:00:00Z', 'not-a-date')).toBeUndefined();
    expect(validRailEnd('2026-08-20T14:00:00Z', '2026-08-20T13:00:00Z')).toBeUndefined();
  });
});

describe('railHourRange', () => {
  const at = (hour: number) => new Date(2026, 8, 21, hour, 0, 0).toISOString();

  it('spans the configured workday when nothing is scheduled outside it', () => {
    expect(railHourRange('08:00', '18:00')).toEqual({ startHour: 8, endHour: 18 });
  });

  it('narrows with a shorter workday', () => {
    expect(railHourRange('09:00', '15:00')).toEqual({ startHour: 9, endHour: 15 });
  });

  it('widens to keep an early block on the rail', () => {
    expect(railHourRange('08:00', '18:00', [{ startAt: at(6) }])).toEqual({
      startHour: 6,
      endHour: 18,
    });
  });

  it('widens to keep a late block and its end hour on the rail', () => {
    expect(railHourRange('08:00', '18:00', [{ startAt: at(20), endAt: at(22) }])).toEqual({
      startHour: 8,
      endHour: 22,
    });
  });

  it('ignores a block whose timestamps do not parse', () => {
    expect(railHourRange('08:00', '18:00', [{ startAt: 'nope', endAt: undefined }])).toEqual({
      startHour: 8,
      endHour: 18,
    });
  });

  it('falls back to the previous fixed range when the setting is unusable', () => {
    expect(railHourRange('', '')).toEqual({ startHour: 7, endHour: 22 });
    expect(railHourRange('99:00', '18:00')).toEqual({ startHour: 7, endHour: 18 });
  });

  it('orders the range even when the stored workday is inverted', () => {
    expect(railHourRange('18:00', '08:00')).toEqual({ startHour: 8, endHour: 18 });
  });
});
