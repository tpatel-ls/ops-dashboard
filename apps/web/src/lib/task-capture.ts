import type { Priority, Project, Task } from '@ops-dashboard/core';
import { destinationOrgId, projectsForDestination, type WorkDestination } from './work-logger';
import { isActiveProject } from './project-query';

export type TaskSchedule = 'inbox' | 'today' | 'tomorrow' | 'date';

export const LAST_TASK_DESTINATION_KEY = 'ops:last-task-destination';
export const LAST_TASK_PROJECT_KEY = 'ops:last-task-project';

export function taskScheduleLabel(schedule: TaskSchedule, scheduledDate: string): string {
  if (schedule === 'inbox') return 'Inbox';
  if (schedule === 'today') return 'Today';
  if (schedule === 'tomorrow') return 'Tomorrow';
  if (!scheduledDate) return 'Pick date';

  const [year, month, day] = scheduledDate.split('-').map(Number);
  if (!year || !month || !day) return 'Pick date';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

export function resolveRecentProject(
  projects: Project[],
  destination: WorkDestination,
  recentProjectId: string | null,
): Project | undefined {
  if (!recentProjectId) return undefined;
  return projectsForDestination(projects, destination).find(
    (project) => project.id === recentProjectId && isActiveProject(project),
  );
}

export function taskCaptureOverrides(
  destination: WorkDestination,
  project: Project | undefined,
  scheduledFor: string | undefined,
  priority: Priority,
): Partial<Task> {
  if (project) {
    return {
      projectId: project.id,
      ...(project.orgId ? { orgId: project.orgId } : {}),
      ...(project.domainId ? { domainId: project.domainId } : {}),
      ...(scheduledFor ? { scheduledFor } : {}),
      priority,
    };
  }

  const orgId = destinationOrgId(destination);
  return {
    ...(orgId ? { orgId } : {}),
    ...(scheduledFor ? { scheduledFor } : {}),
    priority,
  };
}
