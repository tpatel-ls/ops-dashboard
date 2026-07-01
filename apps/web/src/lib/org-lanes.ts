'use client';

import type { Project, Task } from '@ops-dashboard/core';

/**
 * Resolve the lane (orgId or undefined = Personal) for a task. orgId is
 * denormalized onto tasks at write time; older records fall back through
 * their project so pre-migration data still lands in the right lane.
 */
export function taskLane(
  task: Pick<Task, 'orgId' | 'projectId'>,
  projectMap: Pick<Map<string, Project>, 'get'>,
): string | undefined {
  if (task.orgId) return task.orgId;
  return task.projectId ? projectMap.get(task.projectId)?.orgId : undefined;
}
