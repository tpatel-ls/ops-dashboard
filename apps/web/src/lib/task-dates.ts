import { localDay } from '@ops-dashboard/core';
import type { Task } from '@ops-dashboard/core';

type TaskDates = Pick<Task, 'scheduledFor' | 'dueAt'>;

/** Earliest valid local calendar day on which a task needs attention. */
export function taskCommitmentDay(task: TaskDates): string | undefined {
  const scheduled = localDay(task.scheduledFor);
  const due = localDay(task.dueAt);
  if (!scheduled) return due;
  if (!due) return scheduled;
  return scheduled < due ? scheduled : due;
}

export function taskNeedsAttentionBy(task: TaskDates, day: string): boolean {
  if (localDay(day) !== day) return false;
  const scheduled = localDay(task.scheduledFor);
  const due = localDay(task.dueAt);
  return scheduled === day || Boolean(due && due <= day);
}

export function taskIsOverdue(task: TaskDates, day: string): boolean {
  if (localDay(day) !== day) return false;
  const scheduled = localDay(task.scheduledFor);
  const due = localDay(task.dueAt);
  return Boolean((scheduled && scheduled < day) || (due && due < day));
}
