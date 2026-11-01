import { describe, expect, it } from 'vitest';
import {
  taskClockTime,
  taskDateLabel,
  taskPlanningTimestamp,
  taskReminderLabel,
  taskResultSummary,
  taskSearchStatus,
} from './task-presentation';

describe('taskPlanningTimestamp', () => {
  it('uses the first valid planning instant', () => {
    expect(
      taskPlanningTimestamp({
        startAt: 'not-a-date',
        dueAt: '2026-08-26T14:00:00.000Z',
        scheduledFor: '2026-08-27',
      }),
    ).toBe(Date.parse('2026-08-26T14:00:00.000Z'));
  });

  it('ignores tasks without valid planning dates', () => {
    expect(
      taskPlanningTimestamp({ startAt: 'invalid', scheduledFor: '2026-02-30' }),
    ).toBeUndefined();
  });
});

describe('taskResultSummary', () => {
  it.each([
    [0, false, 'No tasks'],
    [1, false, '1 task'],
    [4, false, '4 tasks'],
    [0, true, 'No matching tasks'],
    [1, true, '1 matching task'],
    [4, true, '4 matching tasks'],
  ] as const)('summarizes %i tasks with filtered=%s', (count, filtered, expected) => {
    expect(taskResultSummary(count, filtered)).toBe(expected);
  });
});

describe('taskDateLabel', () => {
  const today = '2026-07-26';

  it.each([
    ['2026-07-26', false, 'Today'],
    ['2026-07-27', false, 'Tomorrow'],
    ['2026-07-25', false, 'Yesterday'],
    ['2026-07-24', false, 'Overdue · Jul 24'],
    ['2026-07-30', false, 'Jul 30'],
    ['2026-07-24', true, 'Jul 24'],
  ] as const)('presents %s for done=%s', (date, done, expected) => {
    expect(taskDateLabel(date, today, done)).toBe(expected);
  });

  it('does not derive labels from malformed calendar inputs', () => {
    expect(taskDateLabel('2026-07-24 trailing', today, false)).toBe('2026-07-24 trailing');
    expect(taskDateLabel('2026-02-30', today, false)).toBe('2026-02-30');
    expect(taskDateLabel('2026-07-24', 'not-a-day', false)).toBe('Jul 24');
  });
});

describe('taskClockTime', () => {
  it('formats a parseable instant as a time input value', () => {
    const at = new Date(2026, 8, 19, 14, 5).toISOString();
    expect(taskClockTime(at)).toBe('14:05');
  });

  it('returns an empty value instead of throwing on an unreadable instant', () => {
    expect(taskClockTime(undefined)).toBe('');
    expect(taskClockTime('')).toBe('');
    expect(taskClockTime('not-a-date')).toBe('');
    expect(taskClockTime('2026-02-30')).toBe('');
  });
});

describe('taskReminderLabel', () => {
  it('formats a parseable trigger instant', () => {
    const at = new Date(2026, 8, 19, 9, 30).toISOString();
    expect(taskReminderLabel(at)).toBe('Sat 19 Sep 09:30');
  });

  it('states that the time is unavailable rather than throwing', () => {
    expect(taskReminderLabel('not-a-date')).toBe('Time unavailable');
    expect(taskReminderLabel(undefined)).toBe('Time unavailable');
  });
});

describe('taskSearchStatus', () => {
  it('labels archived tasks as archived rather than open', () => {
    expect(taskSearchStatus('archived')).toEqual({ label: 'Archived', closed: true });
  });

  it('treats done as closed and every other status as open', () => {
    expect(taskSearchStatus('done')).toEqual({ label: 'Done', closed: true });
    for (const status of ['backlog', 'todo', 'doing', 'blocked'] as const) {
      expect(taskSearchStatus(status)).toEqual({ label: 'Open', closed: false });
    }
  });

  it('keeps an archived task with a past date from reading as overdue', () => {
    const { closed } = taskSearchStatus('archived');
    expect(taskDateLabel('2026-07-24', '2026-07-26', closed)).toBe('Jul 24');
  });
});
