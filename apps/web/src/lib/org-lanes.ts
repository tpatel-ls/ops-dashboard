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

function trimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
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
  const directOrgId = trimmedString(task.orgId);
  if (directOrgId) return directOrgId;
  const projectId = trimmedString(task.projectId);
  return projectId ? trimmedString(projectMap.get(projectId)?.orgId) : undefined;
}
