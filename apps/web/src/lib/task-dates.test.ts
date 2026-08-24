import { describe, expect, it } from 'vitest';
import type { Task } from '@ops-dashboard/core';
import {
  summarizeTodayTasks,
  taskCommitmentDay,
  taskIsOverdue,
  taskNeedsAttentionBy,
} from './task-dates';

describe('task calendar dates', () => {
  it('uses the browser-local day for timestamped deadlines', () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = 'America/Chicago';
    try {
      const task = { dueAt: '2026-08-25T01:00:00.000Z' };

      expect(taskCommitmentDay(task)).toBe('2026-08-24');
      expect(taskNeedsAttentionBy(task, '2026-08-24')).toBe(true);
      expect(taskIsOverdue(task, '2026-08-25')).toBe(true);
    } finally {
      process.env.TZ = originalTimezone;
    }
  });

  it('uses the earlier of a schedule and deadline', () => {
    expect(
      taskCommitmentDay({ scheduledFor: '2026-08-27', dueAt: '2026-08-26T12:00:00.000Z' }),
    ).toBe('2026-08-26');
  });

  it('ignores malformed task and comparison dates', () => {
    const task = { scheduledFor: '2026-02-30', dueAt: 'not-a-date' };

    expect(taskCommitmentDay(task)).toBeUndefined();
    expect(taskNeedsAttentionBy(task, '2026-08-24')).toBe(false);
    expect(taskNeedsAttentionBy({}, '2026-99-99')).toBe(false);
    expect(taskIsOverdue(task, '2026-08-24')).toBe(false);
  });
});

describe('summarizeTodayTasks', () => {
  const task = (patch: Partial<Task>): Task =>
    ({
      id: 'task',
      title: 'Task',
      status: 'todo',
      priority: 0,
      tags: [],
      reminders: [],
      checklist: [],
      order: 0,
      createdAt: '2026-08-01T12:00:00.000Z',
      updatedAt: '2026-08-01T12:00:00.000Z',
      version: 1,
      deviceId: 'test',
      ...patch,
    }) as Task;

  it('counts due, completed, and overdue live tasks', () => {
    const result = summarizeTodayTasks(
      [
        task({ dueAt: '2026-08-24T12:00:00Z' }),
        task({ scheduledFor: '2026-08-24', status: 'done' }),
        task({ scheduledFor: '2026-08-23' }),
        task({ dueAt: 'invalid' }),
        task({ scheduledFor: '2026-08-24', deletedAt: '2026-08-24T12:00:00Z' }),
      ],
      '2026-08-24',
    );

    expect(result).toEqual({ total: 2, done: 1, overdue: 1 });
  });
});
