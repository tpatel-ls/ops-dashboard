import { describe, expect, it, vi } from 'vitest';
import type { Task } from '@ops-dashboard/core';
import {
  rollForwardPatch,
  rollForwardTasks,
  taskCompletedOn,
  taskNeedsRollForward,
} from './daily-review';

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

  it('ignores malformed scheduled calendar days', () => {
    expect(taskNeedsRollForward(task({ scheduledFor: '2026-00-10' }), '2026-08-03')).toBe(false);
  });

  it('does not classify tasks against a malformed review day', () => {
    const completed = task({ completedAt: '2026-08-03T12:00:00.000Z' });
    const scheduled = task({ scheduledFor: '2026-08-03' });

    expect(taskCompletedOn(completed, '2026-99-99')).toBe(false);
    expect(taskNeedsRollForward(scheduled, 'not-a-day')).toBe(false);
  });

  it('moves an overdue deadline while preserving its local time', () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = 'America/Chicago';
    try {
      const patch = rollForwardPatch(
        task({ dueAt: new Date(2026, 7, 3, 17, 30).toISOString() }),
        '2026-08-03',
        '2026-08-04',
      );
      const movedDue = new Date(patch.dueAt!);

      expect(patch.scheduledFor).toBe('2026-08-04');
      expect(movedDue.getDate()).toBe(4);
      expect(movedDue.getHours()).toBe(17);
      expect(movedDue.getMinutes()).toBe(30);
    } finally {
      process.env.TZ = originalTimezone;
    }
  });

  it('keeps a future deadline when only the schedule slipped', () => {
    const futureDue = '2026-08-10T17:00:00.000Z';

    expect(
      rollForwardPatch(
        task({ scheduledFor: '2026-08-03', dueAt: futureDue }),
        '2026-08-03',
        '2026-08-04',
      ),
    ).toEqual({ scheduledFor: '2026-08-04' });
  });

  it('rejects malformed review dates before creating a patch', () => {
    expect(() => rollForwardPatch(task({}), '2026-02-30', '2026-08-04')).toThrow(
      'Review dates must be valid calendar days',
    );
    expect(() => rollForwardPatch(task({}), '2026-08-03', '2026-13-01')).toThrow(
      'Review dates must be valid calendar days',
    );
  });
});

describe('rollForwardTasks', () => {
  it('applies a review patch to each selected task', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const tasks = [
      task({ id: 'task-1', scheduledFor: '2026-08-03' }),
      task({ id: 'task-2', dueAt: '2026-08-03T17:00:00.000Z' }),
    ];

    await rollForwardTasks(tasks, '2026-08-03', '2026-08-04', update);

    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledWith('task-1', { scheduledFor: '2026-08-04' });
  });

  it('reports persistence failures to the caller', async () => {
    const update = vi.fn().mockRejectedValue(new Error('storage unavailable'));

    await expect(rollForwardTasks([task({})], '2026-08-03', '2026-08-04', update)).rejects.toThrow(
      'storage unavailable',
    );
  });
});
