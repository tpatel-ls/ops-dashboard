import type { Project } from '@ops-dashboard/core';

export function isActiveProject(project: Project): boolean {
  return Boolean(
    !project.deletedAt &&
      !project.archivedAt &&
      project.status !== 'done' &&
      project.status !== 'archived',
  );
}
