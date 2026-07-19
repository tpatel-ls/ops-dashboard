import type { Task } from '@ops-dashboard/core';

export type CalendarTaskKind = 'time-block' | 'scheduled' | 'due';

export function calendarKindOf(task: Pick<Task, 'startAt' | 'scheduledFor' | 'dueAt'>): CalendarTaskKind | undefined {
  if (task.startAt) return 'time-block';
  if (task.scheduledFor) return 'scheduled';
  if (task.dueAt) return 'due';
  return undefined;
}

export function calendarDateOf(task: Pick<Task, 'startAt' | 'scheduledFor' | 'dueAt'>): string | undefined {
  if (task.startAt) return task.startAt.slice(0, 10);
  if (task.scheduledFor) return task.scheduledFor.slice(0, 10);
  if (task.dueAt) return task.dueAt.slice(0, 10);
  return undefined;
}

export function compareCalendarTasks(a: Task, b: Task): number {
  if (a.startAt && b.startAt) return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  if (a.startAt) return -1;
  if (b.startAt) return 1;
  if (a.priority !== b.priority) return b.priority - a.priority;
  return a.title.localeCompare(b.title);
}
