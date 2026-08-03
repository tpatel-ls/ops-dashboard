import { describe, expect, it } from 'vitest';
import type { Task } from '@ops-dashboard/core';
import { taskCompletedOn, taskNeedsRollForward } from './daily-review';

function task(patch: Partial<Task>): Task {
  return {
    id: 'task-1',
    title: 'Review task',
    status: 'todo',
    priority: 0,
    tags: [],
    reminders: [],
    checklist: [],
    order: 1,
    createdAt: '2026-08-01T12:00:00.000Z',
    updatedAt: '2026-08-01T12:00:00.000Z',
    version: 1,
    deviceId: 'test',
    ...patch,
  };
}

describe('daily review task dates', () => {
  it('uses browser-local days for completion and due timestamps', () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = 'America/Chicago';
    try {
      const lateEvening = task({
        completedAt: '2026-08-04T01:00:00.000Z',
        dueAt: '2026-08-04T01:00:00.000Z',
      });

      expect(taskCompletedOn(lateEvening, '2026-08-03')).toBe(true);
      expect(taskNeedsRollForward(lateEvening, '2026-08-03')).toBe(true);
    } finally {
      process.env.TZ = originalTimezone;
    }
  });

  it('ignores malformed due timestamps', () => {
    expect(taskNeedsRollForward(task({ dueAt: 'not-a-date' }), '2026-08-03')).toBe(false);
  });
});
