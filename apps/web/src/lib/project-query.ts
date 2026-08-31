import { localDay, type Project } from '@ops-dashboard/core';

export type ProjectSort = 'name' | 'due' | 'recent';

export function isActiveProject(project: Project): boolean {
  return Boolean(
    !project.deletedAt &&
    !project.archivedAt &&
    project.status !== 'done' &&
    project.status !== 'archived',
  );
}

function projectSearchText(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('en-US');
}

export function matchesProjectSearch(project: Project, query: string): boolean {
  const needle = projectSearchText(query.trim());
  if (!needle) return true;
  return [project.name, project.description]
    .filter((value): value is string => Boolean(value))
    .some((value) => projectSearchText(value).includes(needle));
}

function compareOptionalDates(a?: string, b?: string, descending = false): number {
  if (a && !b) return -1;
  if (!a && b) return 1;
  if (!a || !b) return 0;
  return descending ? b.localeCompare(a) : a.localeCompare(b);
}

function compareRecentTimestamps(a?: string, b?: string): number {
  const aTimestamp = a ? Date.parse(a) : Number.NaN;
  const bTimestamp = b ? Date.parse(b) : Number.NaN;
  const hasA = Number.isFinite(aTimestamp);
  const hasB = Number.isFinite(bTimestamp);
  if (hasA && !hasB) return -1;
  if (!hasA && hasB) return 1;
  return hasA && hasB ? bTimestamp - aTimestamp : 0;
}

export function compareProjects(a: Project, b: Project, sort: ProjectSort): number {
  if (sort === 'due') {
    const dueOrder = compareOptionalDates(localDay(a.dueDate), localDay(b.dueDate));
    if (dueOrder !== 0) return dueOrder;
  }
  if (sort === 'recent') {
    const recentOrder = compareRecentTimestamps(a.lastWorkedAt, b.lastWorkedAt);
    if (recentOrder !== 0) return recentOrder;
  }
  const nameOrder = a.name.localeCompare(b.name);
  return nameOrder !== 0 ? nameOrder : a.id.localeCompare(b.id);
}
