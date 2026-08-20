import { localDay } from '@ops-dashboard/core';
import type { Task } from '@ops-dashboard/core';

export function tasksForTodayRail(tasks: Task[], day: string): Task[] {
  if (localDay(day) !== day) return [];
  return tasks
    .filter((task) => {
      if (task.deletedAt || task.status === 'archived' || typeof task.startAt !== 'string') {
        return false;
      }
      return localDay(task.startAt) === day && Number.isFinite(Date.parse(task.startAt));
    })
    .sort((left, right) => {
      const time = Date.parse(left.startAt!) - Date.parse(right.startAt!);
      return time || left.order - right.order || left.title.localeCompare(right.title);
    });
}

export function validRailEnd(startAt: string, endAt: string | undefined): Date | undefined {
  const start = Date.parse(startAt);
  const end = endAt ? Date.parse(endAt) : Number.NaN;
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? new Date(end) : undefined;
}
