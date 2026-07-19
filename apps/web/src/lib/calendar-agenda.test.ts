import { describe, expect, it } from 'vitest';
import type { Task } from '@ops-dashboard/core';
import { calendarDateOf, calendarKindOf, compareCalendarTasks } from './calendar-agenda';

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
    expect(calendarKindOf(task('block', { startAt: '2026-07-20T09:00:00', scheduledFor: '2026-07-20' }))).toBe('time-block');
    expect(calendarKindOf(task('scheduled', { scheduledFor: '2026-07-20', dueAt: '2026-07-20' }))).toBe('scheduled');
    expect(calendarKindOf(task('due', { dueAt: '2026-07-20' }))).toBe('due');
  });

  it('sorts timed work first, followed by priority and title', () => {
    const items = [
      task('normal', { scheduledFor: '2026-07-20', title: 'Normal' }),
      task('critical', { scheduledFor: '2026-07-20', priority: 3, title: 'Critical' }),
      task('later', { startAt: '2026-07-20T14:00:00', title: 'Later' }),
      task('early', { startAt: '2026-07-20T09:00:00', title: 'Early' }),
    ];

    expect(items.sort(compareCalendarTasks).map((item) => item.id)).toEqual([
      'early',
      'later',
      'critical',
      'normal',
    ]);
  });
});
