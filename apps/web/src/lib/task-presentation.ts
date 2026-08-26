import { localDay } from '@ops-dashboard/core';
import type { Task } from '@ops-dashboard/core';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';

export function taskPlanningTimestamp(
  task: Pick<Task, 'startAt' | 'dueAt' | 'scheduledFor'>,
): number | undefined {
  for (const value of [task.startAt, task.dueAt, task.scheduledFor]) {
    if (!value) continue;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value) && localDay(value) !== value) continue;
    const timestamp = Date.parse(value);
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return undefined;
}

export function taskResultSummary(count: number, filtered: boolean): string {
  if (count === 0) return filtered ? 'No matching tasks' : 'No tasks';
  const noun = count === 1 ? 'task' : 'tasks';
  return filtered ? `${count} matching ${noun}` : `${count} ${noun}`;
}

export function taskDateLabel(date: string, today: string, done: boolean): string {
  if (localDay(date) !== date) return date;
  const parsed = parseISO(date);
  const calendarLabel = format(parsed, 'MMM d');
  if (localDay(today) !== today) return calendarLabel;

  const offset = differenceInCalendarDays(parsed, parseISO(today));
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  if (!done && offset === -1) return 'Yesterday';

  return !done && offset < -1 ? `Overdue · ${calendarLabel}` : calendarLabel;
}
