import { localDay } from '@ops-dashboard/core';
import type { Task } from '@ops-dashboard/core';

export function taskCompletedOn(task: Task, day: string): boolean {
  return !task.deletedAt && localDay(task.completedAt) === day;
}

export function taskNeedsRollForward(task: Task, day: string): boolean {
  if (task.deletedAt || task.status === 'done' || task.status === 'archived') return false;
  const dueDay = localDay(task.dueAt);
  return Boolean((task.scheduledFor && task.scheduledFor <= day) || (dueDay && dueDay <= day));
}
