'use client';

import type { Domain, Project, Task } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';

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
  const projectDomain = new Map(activeProjects.map((project) => [project.id, project.domainId]));
  const openTasks = tasks.filter(
    (task) =>
      !task.deletedAt &&
      task.status !== 'done' &&
      task.status !== 'archived' &&
      (task.domainId ?? (task.projectId ? projectDomain.get(task.projectId) : undefined)) === domainId,
  );

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
  return putRecord(
    'domains',
    newRecord<Domain>({
      name: input.name,
      color: input.color,
      ...(input.icon ? { icon: input.icon } : {}),
      ...(input.description ? { description: input.description } : {}),
      order: input.order ?? Date.now(),
    }),
  );
}

export const updateDomain = (id: string, patch: Partial<Domain>) =>
  patchRecord<Domain>('domains', id, patch);

export const archiveDomain = (id: string) =>
  patchRecord<Domain>('domains', id, { archivedAt: new Date().toISOString() });

export const deleteDomain = (id: string) => softDeleteRecord<Domain>('domains', id);
