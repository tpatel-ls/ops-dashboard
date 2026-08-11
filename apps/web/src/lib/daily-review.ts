import { localDay } from '@ops-dashboard/core';
import type { Task } from '@ops-dashboard/core';

export function taskCompletedOn(task: Task, day: string): boolean {
  return !task.deletedAt && localDay(task.completedAt) === day;
}

export function taskNeedsRollForward(task: Task, day: string): boolean {
  if (task.deletedAt || task.status === 'done' || task.status === 'archived') return false;
  const scheduledDay = localDay(task.scheduledFor);
  const dueDay = localDay(task.dueAt);
  return Boolean((scheduledDay && scheduledDay <= day) || (dueDay && dueDay <= day));
}

export function rollForwardPatch(task: Task, currentDay: string, targetDay: string): Partial<Task> {
  if (localDay(currentDay) !== currentDay || localDay(targetDay) !== targetDay) {
    throw new Error('Review dates must be valid calendar days.');
  }
  const patch: Partial<Task> = { scheduledFor: targetDay };
  const dueDay = localDay(task.dueAt);
  if (!task.dueAt || !dueDay || dueDay > currentDay) return patch;

  const due = new Date(task.dueAt);
  const [year, month, day] = targetDay.split('-').map(Number);
  due.setFullYear(year!, month! - 1, day!);
  patch.dueAt = due.toISOString();
  return patch;
}
