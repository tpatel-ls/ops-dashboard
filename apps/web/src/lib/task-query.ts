import type { Task } from '@ops-dashboard/core';

function taskDate(task: Task): string | null {
  return task.scheduledFor ?? task.dueAt?.slice(0, 10) ?? null;
}

export function compareTasks(a: Task, b: Task): number {
  const aDate = taskDate(a);
  const bDate = taskDate(b);
  if (aDate && !bDate) return -1;
  if (!aDate && bDate) return 1;
  if (aDate && bDate) {
    const dateOrder = aDate.localeCompare(bDate);
    if (dateOrder !== 0) return dateOrder;
  }

  const priorityOrder = b.priority - a.priority;
  if (priorityOrder !== 0) return priorityOrder;

  const itemOrder = a.order - b.order;
  if (itemOrder !== 0) return itemOrder;

  return a.title.localeCompare(b.title);
}
