import { describe, expect, it } from 'vitest';
import type { Task } from '@ops-dashboard/core';
import { tasksForTodayRail, validRailEnd } from './today-rail';

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
