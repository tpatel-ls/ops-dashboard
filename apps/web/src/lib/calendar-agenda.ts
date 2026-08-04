import { isoDay, localDay } from '@ops-dashboard/core';
import type { Task } from '@ops-dashboard/core';

export type CalendarTaskKind = 'time-block' | 'scheduled' | 'due';

function validTimestamp(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

export function calendarKindOf(
  task: Pick<Task, 'startAt' | 'scheduledFor' | 'dueAt'>,
): CalendarTaskKind | undefined {
  if (validTimestamp(task.startAt) !== undefined) return 'time-block';
  if (task.scheduledFor && localDay(task.scheduledFor) === task.scheduledFor) return 'scheduled';
  if (validTimestamp(task.dueAt) !== undefined) return 'due';
  return undefined;
}

export function calendarDateOf(
  task: Pick<Task, 'startAt' | 'scheduledFor' | 'dueAt'>,
): string | undefined {
  if (task.startAt) {
    const start = new Date(task.startAt);
    if (Number.isFinite(start.getTime())) return isoDay(start);
  }
  if (task.scheduledFor) {
    const scheduled = localDay(task.scheduledFor);
    if (scheduled) return scheduled;
  }
  if (task.dueAt) {
    const due = new Date(task.dueAt);
    return Number.isFinite(due.getTime()) ? isoDay(due) : undefined;
  }
  return undefined;
}

export function compareCalendarTasks(a: Task, b: Task): number {
  const aStart = validTimestamp(a.startAt);
  const bStart = validTimestamp(b.startAt);
  if (aStart !== undefined && bStart !== undefined) return aStart - bStart;
  if (aStart !== undefined) return -1;
  if (bStart !== undefined) return 1;
  if (a.priority !== b.priority) return b.priority - a.priority;
  return a.title.localeCompare(b.title);
}
