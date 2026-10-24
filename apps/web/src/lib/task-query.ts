import { localDay } from '@ops-dashboard/core';
import type { Task } from '@ops-dashboard/core';
import { compareText } from './compare-text';
import { taskEarliestDay } from './task-dates';

export function safeTaskPriority(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 3
    ? value
    : 0;
}

function taskPriority(task: Task): number {
  return safeTaskPriority(task.priority);
}

function taskOrder(task: Task): number | undefined {
  return Number.isFinite(task.order) ? task.order : undefined;
}

function taskFilterText(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('en-US');
}

export function safeTaskTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.filter((tag): tag is string => {
    if (typeof tag !== 'string' || seen.has(tag)) return false;
    seen.add(tag);
    return true;
  });
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

  const titleOrder = compareText(a.title, b.title);
  return titleOrder !== 0 ? titleOrder : compareText(a.id, b.id);
}

export function compareProjectTasks(a: Task, b: Task): number {
  if (a.status === 'done' && b.status !== 'done') return 1;
  if (b.status === 'done' && a.status !== 'done') return -1;

  const aOrder = taskOrder(a);
  const bOrder = taskOrder(b);
  if (aOrder !== undefined && bOrder === undefined) return -1;
  if (aOrder === undefined && bOrder !== undefined) return 1;
  if (aOrder !== undefined && bOrder !== undefined && aOrder !== bOrder) {
    return aOrder - bOrder;
  }

  const titleOrder = compareText(a.title, b.title);
  return titleOrder !== 0 ? titleOrder : compareText(a.id, b.id);
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
  const tags = safeTaskTags(task.tags);
  return [task.title, task.notes, projectName, ...tags]
    .filter((value): value is string => typeof value === 'string' && Boolean(value))
    .some((value) => taskFilterText(value).includes(needle));
}

export function matchesTaskTag(task: Task, selectedTag: string | null): boolean {
  if (!selectedTag) return true;
  const normalized = taskFilterText(selectedTag.trim());
  if (!normalized) return true;
  return safeTaskTags(task.tags).some(
    (tag) => typeof tag === 'string' && taskFilterText(tag) === normalized,
  );
}

/**
 * Tag chips with the number of tasks carrying each tag, grouped the way
 * `matchesTaskTag` matches: case and Unicode form do not split a tag. Each
 * chip keeps the first spelling seen, and a task counts once per tag even if
 * it stores two spellings. Most-used first, ties by label.
 */
export function taskTagCounts(tasks: Task[]): Array<[tag: string, count: number]> {
  const groups = new Map<string, { label: string; count: number }>();
  for (const task of tasks) {
    const seen = new Set<string>();
    for (const tag of safeTaskTags(task.tags)) {
      const label = tag.trim();
      const key = taskFilterText(label);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const group = groups.get(key);
      if (group) group.count += 1;
      else groups.set(key, { label, count: 1 });
    }
  }
  return Array.from(groups.values())
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map(({ label, count }) => [label, count]);
}
