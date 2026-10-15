'use client';

import type { Organization, Project, Task } from '@ops-dashboard/core';
import { compareText } from './compare-text';

export function compareOrganizations(left: Organization, right: Organization): number {
  const leftOrder = typeof left.order === 'number' && Number.isFinite(left.order) ? left.order : 0;
  const rightOrder =
    typeof right.order === 'number' && Number.isFinite(right.order) ? right.order : 0;
  const order = leftOrder - rightOrder;
  if (order !== 0) return order;
  const name = compareText(left.name, right.name);
  return name !== 0 ? name : compareText(left.id, right.id);
}

/**
 * Resolve the lane (orgId or undefined = Personal) for a task. orgId is
 * denormalized onto tasks at write time; older records fall back through
 * their project so pre-migration data still lands in the right lane.
 */
export function taskLane(
  task: Pick<Task, 'orgId' | 'projectId'>,
  projectMap: Pick<Map<string, Project>, 'get'>,
): string | undefined {
  const directOrgId = task.orgId?.trim();
  if (directOrgId) return directOrgId;
  const projectId = task.projectId?.trim();
  return projectId ? projectMap.get(projectId)?.orgId?.trim() || undefined : undefined;
}
