import { isoDay } from '@ops-dashboard/core';
import type { Task } from '@ops-dashboard/core';

export type CalendarTaskKind = 'time-block' | 'scheduled' | 'due';

export function calendarKindOf(task: Pick<Task, 'startAt' | 'scheduledFor' | 'dueAt'>): CalendarTaskKind | undefined {
  if (task.startAt) return 'time-block';
  if (task.scheduledFor) return 'scheduled';
  if (task.dueAt) return 'due';
  return undefined;
}

export function calendarDateOf(task: Pick<Task, 'startAt' | 'scheduledFor' | 'dueAt'>): string | undefined {
  if (task.startAt) {
    const start = new Date(task.startAt);
    return Number.isFinite(start.getTime()) ? isoDay(start) : undefined;
  }
  if (task.scheduledFor) return task.scheduledFor.slice(0, 10);
  if (task.dueAt) {
    const due = new Date(task.dueAt);
    return Number.isFinite(due.getTime()) ? isoDay(due) : undefined;
  }
  return undefined;
}

export function compareCalendarTasks(a: Task, b: Task): number {
  if (a.startAt && b.startAt) return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  if (a.startAt) return -1;
  if (b.startAt) return 1;
  if (a.priority !== b.priority) return b.priority - a.priority;
  return a.title.localeCompare(b.title);
}
