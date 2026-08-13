'use client';

import type { Domain, Project, Task } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';

function normalizeDomainPatch(patch: Partial<Domain>): Partial<Domain> {
  const normalized = { ...patch };
  if (Object.hasOwn(normalized, 'name')) {
    if (typeof normalized.name !== 'string') throw new Error('Domain name is required.');
    normalized.name = normalized.name.trim();
    if (!normalized.name) throw new Error('Domain name is required.');
  }
  if (Object.hasOwn(normalized, 'color')) {
    if (typeof normalized.color !== 'string') throw new Error('Domain color is required.');
    normalized.color = normalized.color.trim();
    if (!normalized.color) throw new Error('Domain color is required.');
  }
  if (Object.hasOwn(normalized, 'order') && !Number.isFinite(normalized.order)) {
    throw new Error('Domain order must be finite.');
  }
  for (const key of ['icon', 'description'] as const) {
    if (normalized[key] !== undefined) normalized[key] = normalized[key]?.trim() || undefined;
  }
  return normalized;
}

export function countDomainWork(
  domainId: string,
  projects: Project[],
  tasks: Task[],
): { projects: number; tasks: number } {
  const activeProjects = projects.filter(
    (project) =>
      !project.deletedAt &&
      !project.archivedAt &&
      project.status !== 'done' &&
      project.status !== 'archived',
  );
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const activeProjectIds = new Set(activeProjects.map((project) => project.id));
  const projectDomain = new Map(activeProjects.map((project) => [project.id, project.domainId]));
  const openTasks = tasks.filter((task) => {
    const project = task.projectId ? projectById.get(task.projectId) : undefined;
    if (project && !activeProjectIds.has(project.id)) return false;
    return (
      !task.deletedAt &&
      task.status !== 'done' &&
      task.status !== 'archived' &&
      (task.domainId ?? (task.projectId ? projectDomain.get(task.projectId) : undefined)) ===
        domainId
    );
  });

  return {
    projects: activeProjects.filter((project) => project.domainId === domainId).length,
    tasks: openTasks.length,
  };
}

export function createDomain(input: {
  name: string;
  color: string;
  icon?: string;
  description?: string;
  order?: number;
}): Promise<Domain> {
  const fields = normalizeDomainPatch({
    name: input.name,
    color: input.color,
    icon: input.icon,
    description: input.description,
    order: input.order ?? Date.now(),
  });

  return putRecord(
    'domains',
    newRecord<Domain>({
      name: fields.name!,
      color: fields.color!,
      ...(fields.icon ? { icon: fields.icon } : {}),
      ...(fields.description ? { description: fields.description } : {}),
      order: fields.order!,
    }),
  );
}

export const updateDomain = (id: string, patch: Partial<Domain>) =>
  patchRecord<Domain>('domains', id, normalizeDomainPatch(patch));

export const archiveDomain = (id: string) =>
  patchRecord<Domain>('domains', id, { archivedAt: new Date().toISOString() });

export const deleteDomain = (id: string) => softDeleteRecord<Domain>('domains', id);
