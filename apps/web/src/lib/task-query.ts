import { localDay } from '@ops-dashboard/core';
import type { Task } from '@ops-dashboard/core';
import { taskEarliestDay } from './task-dates';

function taskPriority(task: Task): number {
  return Number.isFinite(task.priority) && task.priority >= 0 && task.priority <= 3
    ? task.priority
    : 0;
}

function taskOrder(task: Task): number | undefined {
  return Number.isFinite(task.order) ? task.order : undefined;
}

function taskFilterText(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('en-US');
}

export function compareTasks(a: Task, b: Task): number {
  const aDate = taskEarliestDay(a);
  const bDate = taskEarliestDay(b);
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

  const titleOrder = a.title.localeCompare(b.title);
  return titleOrder !== 0 ? titleOrder : a.id.localeCompare(b.id);
}

export type TaskSort = 'default' | 'due' | 'priority' | 'recent';

function validTimestamp(value: string): number | undefined {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

export function compareTasksBy(sort: TaskSort, a: Task, b: Task): number {
  if (sort === 'due') {
    // The "Due date" option used to fall straight through to compareTasks,
    // which orders by the earliest of scheduledFor/dueAt/startAt, so picking it
    // reordered nothing. Order by the due day the task actually carries and
    // leave tasks without one to the shared tie-break below.
    const aDue = localDay(a.dueAt);
    const bDue = localDay(b.dueAt);
    if (aDue && !bDue) return -1;
    if (!aDue && bDue) return 1;
    if (aDue && bDue) {
      const dueOrder = aDue.localeCompare(bDue);
      if (dueOrder !== 0) return dueOrder;
    }
  }
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
  const needle = taskFilterText(query.trim());
  if (!needle) return true;
  return [task.title, task.notes, projectName, ...task.tags]
    .filter((value): value is string => Boolean(value))
    .some((value) => taskFilterText(value).includes(needle));
}

export function matchesTaskTag(task: Task, selectedTag: string | null): boolean {
  if (!selectedTag) return true;
  const normalized = taskFilterText(selectedTag.trim());
  if (!normalized) return true;
  return task.tags.some((tag) => taskFilterText(tag) === normalized);
}
