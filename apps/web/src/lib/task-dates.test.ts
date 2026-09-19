import { afterEach, describe, expect, it } from 'vitest';
import type { Task } from '@ops-dashboard/core';
import {
  summarizeTodayTasks,
  summarizeOpenTasks,
  compareTasksByCommitment,
  taskCommitmentDay,
  taskDueOrScheduledDay,
  taskIsOverdue,
  taskScheduledOn,
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
  it('treats a task due today as needing attention today', () => {
    expect(taskNeedsAttentionBy({ dueAt: '2026-08-24T12:00:00Z' }, '2026-08-24')).toBe(true);
  });
  it('does not mark a task due today as overdue', () => {
    expect(taskIsOverdue({ dueAt: '2026-08-24' }, '2026-08-24')).toBe(false);
  });
  it('uses a due date when no schedule exists', () => {
    expect(taskCommitmentDay({ dueAt: '2026-08-24' })).toBe('2026-08-24');
  });
  it('uses a schedule when no due date exists', () => {
    expect(taskCommitmentDay({ scheduledFor: '2026-08-24' })).toBe('2026-08-24');
  });
  it('rejects malformed calendar days for overdue checks', () => {
    expect(taskIsOverdue({ dueAt: '2026-08-23' }, 'yesterday')).toBe(false);
  });
  it('counts completed tasks finished today in today summaries', () => {
    const completed = {
      id: 'done',
      title: 'Done',
      status: 'done',
      completedAt: '2026-08-24T12:00:00Z',
    } as Task;
    expect(summarizeTodayTasks([completed], '2026-08-24')).toMatchObject({ total: 1, done: 1 });
  });
  it('excludes archived tasks from today summaries', () => {
    const archived = { id: 'archived', title: 'Archived', status: 'archived' } as Task;
    expect(summarizeTodayTasks([archived], '2026-08-24')).toEqual({
      total: 0,
      done: 0,
      overdue: 0,
    });
  });
  it('orders equal commitments by id as a stable tie breaker', () => {
    const make = (id: string) =>
      ({ id, title: id, status: 'todo', priority: 0, scheduledFor: '2026-08-24' }) as Task;
    expect([make('b'), make('a')].sort(compareTasksByCommitment).map((task) => task.id)).toEqual([
      'a',
      'b',
    ]);
  });
  it('reports high priority open tasks independently of date', () => {
    const high = { id: 'high', title: 'High', status: 'todo', priority: 3 } as Task;
    expect(summarizeOpenTasks([high], '2026-08-24').high).toBe(1);
  });
});

describe('open task dates', () => {
  const task = (id: string, patch: Partial<Task>): Task =>
    ({
      id,
      title: id,
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

  it('sorts by the earliest valid commitment then priority', () => {
    const items = [
      task('undated', {}),
      task('later', { scheduledFor: '2026-08-26' }),
      task('urgent', { dueAt: '2026-08-25T12:00:00Z', priority: 3 }),
      task('normal', { scheduledFor: '2026-08-25' }),
    ];

    expect(items.sort(compareTasksByCommitment).map((item) => item.id)).toEqual([
      'urgent',
      'normal',
      'later',
      'undated',
    ]);
  });

  it('summarizes open work using normalized dates', () => {
    const items = [
      task('overdue', { dueAt: '2026-08-23T12:00:00Z' }),
      task('today', { scheduledFor: '2026-08-24', priority: 2 }),
      task('invalid', { dueAt: 'not-a-date', priority: 3 }),
    ];

    expect(summarizeOpenTasks(items, '2026-08-24')).toEqual({
      overdue: 1,
      today: 1,
      high: 2,
    });
  });

  it('excludes completed, archived, and deleted tasks from open summaries', () => {
    const items = [
      task('open', { scheduledFor: '2026-08-24', priority: 2 }),
      task('done', { scheduledFor: '2026-08-24', status: 'done', priority: 3 }),
      task('archived', { dueAt: '2026-08-23T12:00:00Z', status: 'archived', priority: 3 }),
      task('deleted', {
        dueAt: '2026-08-23T12:00:00Z',
        deletedAt: '2026-08-24T12:00:00Z',
        priority: 3,
      }),
    ];

    expect(summarizeOpenTasks(items, '2026-08-24')).toEqual({
      overdue: 0,
      today: 1,
      high: 1,
    });
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

  it('does not carry completed overdue work into later daily totals', () => {
    const result = summarizeTodayTasks(
      [
        task({
          dueAt: '2026-08-20T12:00:00Z',
          status: 'done',
          completedAt: '2026-08-21T12:00:00Z',
        }),
        task({
          dueAt: '2026-08-20T12:00:00Z',
          status: 'done',
          completedAt: '2026-08-24T12:00:00Z',
        }),
      ],
      '2026-08-24',
    );

    expect(result).toEqual({ total: 1, done: 1, overdue: 0 });
  });
});

describe('taskDueOrScheduledDay', () => {
  const originalTimeZone = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTimeZone;
  });

  function inTimeZone<T>(timeZone: string, run: () => T): T {
    process.env.TZ = timeZone;
    return run();
  }

  it('prefers the due day over the scheduled day', () => {
    expect(
      taskDueOrScheduledDay({ dueAt: '2026-09-19T12:00:00.000Z', scheduledFor: '2026-09-25' }),
    ).toBe('2026-09-19');
  });

  it('falls back to the scheduled day', () => {
    expect(taskDueOrScheduledDay({ scheduledFor: '2026-09-25' })).toBe('2026-09-25');
    expect(taskDueOrScheduledDay({})).toBeUndefined();
  });

  it('reports the local day west of UTC, not the UTC day', () => {
    // 20:00 on Sep 19 in Chicago is already Sep 20 in UTC. Slicing the stored
    // instant labelled this task "Tomorrow" and let it skip the overdue check.
    const dueAt = '2026-09-20T01:00:00.000Z';
    expect(dueAt.slice(0, 10)).toBe('2026-09-20');
    expect(inTimeZone('America/Chicago', () => taskDueOrScheduledDay({ dueAt }))).toBe(
      '2026-09-19',
    );
  });

  it('reports the local day east of UTC, not the UTC day', () => {
    // 08:00 on Sep 20 in Tokyo is still Sep 19 in UTC.
    const dueAt = '2026-09-19T23:00:00.000Z';
    expect(dueAt.slice(0, 10)).toBe('2026-09-19');
    expect(inTimeZone('Asia/Tokyo', () => taskDueOrScheduledDay({ dueAt }))).toBe('2026-09-20');
  });

  it('has no day for values that do not parse', () => {
    expect(taskDueOrScheduledDay({ dueAt: 'not-a-date' })).toBeUndefined();
    expect(taskDueOrScheduledDay({ scheduledFor: '2026-02-30' })).toBeUndefined();
  });
});

describe('taskScheduledOn', () => {
  it('matches a task scheduled on that day', () => {
    expect(taskScheduledOn({ scheduledFor: '2026-09-19' }, '2026-09-19')).toBe(true);
    expect(taskScheduledOn({ scheduledFor: '2026-09-20' }, '2026-09-19')).toBe(false);
    expect(taskScheduledOn({}, '2026-09-19')).toBe(false);
  });

  it('places a task whose scheduledFor is a full timestamp', () => {
    // A raw `=== day` comparison never matched these, so the task did not show
    // up on any day of the month grid or week board at all.
    const scheduledFor = new Date(2026, 8, 19, 9, 0).toISOString();
    expect(scheduledFor === '2026-09-19').toBe(false);
    expect(taskScheduledOn({ scheduledFor }, '2026-09-19')).toBe(true);
  });

  it('ignores a scheduledFor that is not a real calendar day', () => {
    expect(taskScheduledOn({ scheduledFor: '2026-02-30' }, '2026-02-30')).toBe(false);
    expect(taskScheduledOn({ scheduledFor: 'not-a-day' }, '2026-09-19')).toBe(false);
  });

  it('never matches when the requested day is not a real calendar day', () => {
    expect(taskScheduledOn({ scheduledFor: '2026-09-19' }, '2026-02-30')).toBe(false);
    expect(taskScheduledOn({ scheduledFor: '2026-09-19' }, 'today')).toBe(false);
  });
});
