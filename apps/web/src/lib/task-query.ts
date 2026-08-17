import { localDay } from '@ops-dashboard/core';
import type { Task } from '@ops-dashboard/core';

function taskDate(task: Task): string | null {
  return localDay(task.scheduledFor) ?? localDay(task.dueAt) ?? localDay(task.startAt) ?? null;
}

function taskPriority(task: Task): number {
  return Number.isFinite(task.priority) && task.priority >= 0 && task.priority <= 3
    ? task.priority
    : 0;
}

function taskOrder(task: Task): number | undefined {
  return Number.isFinite(task.order) ? task.order : undefined;
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

  const priorityOrder = taskPriority(b) - taskPriority(a);
  if (priorityOrder !== 0) return priorityOrder;

  const aOrder = taskOrder(a);
  const bOrder = taskOrder(b);
  if (aOrder !== undefined && bOrder === undefined) return -1;
  if (aOrder === undefined && bOrder !== undefined) return 1;
  if (aOrder !== undefined && bOrder !== undefined) {
    const itemOrder = aOrder - bOrder;
    if (itemOrder !== 0) return itemOrder;
  }

  return a.title.localeCompare(b.title);
}

export type TaskSort = 'default' | 'due' | 'priority' | 'recent';

function validTimestamp(value: string): number | undefined {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

export function compareTasksBy(sort: TaskSort, a: Task, b: Task): number {
  if (sort === 'recent') {
    const aUpdatedAt = validTimestamp(a.updatedAt);
    const bUpdatedAt = validTimestamp(b.updatedAt);
    if (aUpdatedAt !== undefined && bUpdatedAt === undefined) return -1;
    if (aUpdatedAt === undefined && bUpdatedAt !== undefined) return 1;
    if (aUpdatedAt !== undefined && bUpdatedAt !== undefined) {
      const updatedOrder = bUpdatedAt - aUpdatedAt;
      if (updatedOrder !== 0) return updatedOrder;
    }
  }
  if (sort === 'priority') {
    const priorityOrder = taskPriority(b) - taskPriority(a);
    if (priorityOrder !== 0) return priorityOrder;
  }
  return compareTasks(a, b);
}

export function matchesTaskSearch(task: Task, query: string, projectName?: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return [task.title, task.notes, projectName, ...task.tags]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLocaleLowerCase().includes(needle));
}

export function matchesTaskTag(task: Task, selectedTag: string | null): boolean {
  if (!selectedTag) return true;
  const normalized = selectedTag.toLocaleLowerCase();
  return task.tags.some((tag) => tag.toLocaleLowerCase() === normalized);
}
