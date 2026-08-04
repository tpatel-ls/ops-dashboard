import { describe, expect, it } from 'vitest';
import type { Task } from './types';
import { nextOccurrence, projectNextTask, shouldGenerateNext } from './recurrence';

describe('nextOccurrence', () => {
  it('handles daily', () => {
    const next = nextOccurrence({ freq: 'daily', interval: 2 }, new Date('2026-04-26'));
    expect(next.toISOString().slice(0, 10)).toBe('2026-04-28');
  });

  it('handles weekly default', () => {
    const next = nextOccurrence({ freq: 'weekly', interval: 1 }, new Date('2026-04-26'));
    expect(next.toISOString().slice(0, 10)).toBe('2026-05-03');
  });

  it('handles weekly with byDay', () => {
    const sun = new Date('2026-04-26');
    const next = nextOccurrence({ freq: 'weekly', interval: 1, byDay: ['MO', 'WE', 'FR'] }, sun);
    expect(next.getDay()).toBe(1);
  });

  it('honors the interval when rolling weekly byDay rules into their next cycle', () => {
    const friday = new Date('2026-04-24T12:00:00');
    const next = nextOccurrence({ freq: 'weekly', interval: 2, byDay: ['MO', 'WE', 'FR'] }, friday);
    expect(next.getDay()).toBe(1);
    expect(next.getDate()).toBe(4);
    expect(next.getMonth()).toBe(4);
  });

  it('handles monthly', () => {
    const next = nextOccurrence({ freq: 'monthly', interval: 1 }, new Date('2026-04-26'));
    expect(next.toISOString().slice(0, 10)).toBe('2026-05-26');
  });

  it('normalizes malformed intervals instead of producing an invalid date', () => {
    const anchor = new Date('2026-04-26');
    expect(nextOccurrence({ freq: 'daily', interval: Number.NaN }, anchor)).toEqual(
      new Date('2026-04-27'),
    );
    expect(nextOccurrence({ freq: 'daily', interval: 2.9 }, anchor)).toEqual(
      new Date('2026-04-28'),
    );
  });
});

describe('projectNextTask', () => {
  it('preserves local wall-clock time across daylight-saving changes', () => {
    const task = {
      id: 'task-1',
      title: 'Weekly planning',
      status: 'done',
      priority: 0,
      scheduledFor: '2026-03-01',
      startAt: new Date(2026, 2, 1, 9).toISOString(),
      endAt: new Date(2026, 2, 1, 10).toISOString(),
      tags: [],
      order: 1,
      recurrence: { freq: 'weekly', interval: 1 },
      reminders: [],
      checklist: [],
      createdAt: '2026-03-01T14:00:00.000Z',
      updatedAt: '2026-03-01T16:00:00.000Z',
      completedAt: '2026-03-01T16:00:00.000Z',
      version: 1,
      deviceId: 'test',
    } satisfies Task;

    const projected = projectNextTask(task, new Date('2026-03-01T16:00:00.000Z'));

    expect(projected?.scheduledFor).toBe('2026-03-08');
    expect(new Date(projected?.startAt ?? '').getHours()).toBe(9);
    expect(new Date(projected?.endAt ?? '').getHours()).toBe(10);
  });

  it('advances due timestamps with the recurring task', () => {
    const dueAt = new Date(2026, 6, 31, 17, 30);
    const task = {
      id: 'task-1',
      title: 'Daily report',
      status: 'done',
      priority: 0,
      dueAt: dueAt.toISOString(),
      tags: [],
      order: 1,
      recurrence: { freq: 'daily', interval: 1 },
      reminders: [],
      checklist: [],
      createdAt: '2026-07-31T12:00:00.000Z',
      updatedAt: '2026-07-31T22:30:00.000Z',
      version: 1,
      deviceId: 'test',
    } satisfies Task;

    const projected = projectNextTask(task, new Date('2026-07-31T22:30:00.000Z'));
    const projectedDue = new Date(projected?.dueAt ?? '');

    expect(projected?.scheduledFor).toBe('2026-08-01');
    expect(projectedDue.getDate()).toBe(1);
    expect(projectedDue.getHours()).toBe(17);
    expect(projectedDue.getMinutes()).toBe(30);
  });

  it('stops a recurrence chain after its configured count', () => {
    const task = {
      id: 'task-1',
      title: 'Three day reset',
      status: 'done',
      priority: 0,
      scheduledFor: '2026-08-01',
      tags: [],
      order: 1,
      recurrence: { freq: 'daily', interval: 1, count: 3 },
      reminders: [],
      checklist: [],
      createdAt: '2026-08-01T12:00:00.000Z',
      updatedAt: '2026-08-01T12:00:00.000Z',
      version: 1,
      deviceId: 'test',
    } satisfies Task;

    const second = projectNextTask(task, new Date('2026-08-01T13:00:00.000Z'));
    const third = projectNextTask(second!, new Date('2026-08-02T13:00:00.000Z'));

    expect(second?.recurrence?.count).toBe(2);
    expect(third?.scheduledFor).toBe('2026-08-03');
    expect(third?.recurrence?.count).toBe(1);
    expect(projectNextTask(third!, new Date('2026-08-03T13:00:00.000Z'))).toBeNull();
  });

  it('rejects malformed recurrence anchors without throwing', () => {
    const task = {
      id: 'task-1',
      title: 'Broken schedule',
      status: 'done',
      priority: 0,
      scheduledFor: 'not-a-date',
      tags: [],
      order: 1,
      recurrence: { freq: 'daily', interval: 1 },
      reminders: [],
      checklist: [],
      createdAt: '2026-08-01T12:00:00.000Z',
      updatedAt: '2026-08-01T12:00:00.000Z',
      version: 1,
      deviceId: 'test',
    } satisfies Task;

    expect(projectNextTask(task)).toBeNull();
  });
});

describe('shouldGenerateNext', () => {
  it('includes timed occurrences on the recurrence end date', () => {
    const rule = { freq: 'daily', interval: 1, endsOn: '2026-04-27' } as const;

    expect(shouldGenerateNext(rule, 1, new Date(2026, 3, 27, 17, 30))).toBe(true);
    expect(shouldGenerateNext(rule, 1, new Date(2026, 3, 28, 9))).toBe(false);
  });
});
