import { localDay, matchesOrgContext } from '@ops-dashboard/core';
import type { OrgContext, Project, Task } from '@ops-dashboard/core';
import { taskLane } from './org-lanes';
import { isActiveProject } from './project-query';
import { compareTasks } from './task-query';

export interface WorkProjectSummary {
  project: Project;
  openTasks: number;
  completedTasks: number;
  completionPct: number;
}

export interface WorkDashboardModel {
  overdue: Task[];
  today: Task[];
  upcoming: Task[];
  projects: WorkProjectSummary[];
  counts: {
    openTasks: number;
    overdue: number;
    today: number;
    activeProjects: number;
  };
}

function taskDate(task: Task): string | undefined {
  const dates = [task.scheduledFor, task.dueAt, task.startAt]
    .map((value) => localDay(value))
    .filter((value): value is string => Boolean(value));
  return dates.sort()[0];
}

function projectOrder(a: WorkProjectSummary, b: WorkProjectSummary): number {
  const aDue = localDay(a.project.dueDate);
  const bDue = localDay(b.project.dueDate);
  if (aDue && !bDue) return -1;
  if (!aDue && bDue) return 1;
  if (aDue && bDue) {
    const dueOrder = aDue.localeCompare(bDue);
    if (dueOrder !== 0) return dueOrder;
  }
  return a.project.name.localeCompare(b.project.name);
}

export function buildWorkDashboard(
  tasks: Task[],
  projects: Project[],
  ctx: OrgContext,
  today: string,
): WorkDashboardModel {
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const visibleTasks = tasks.filter(
    (task) =>
      !task.deletedAt &&
      task.status !== 'archived' &&
      matchesOrgContext(taskLane(task, projectMap), ctx),
  );
  const openTasks = visibleTasks.filter((task) => task.status !== 'done');
  const sortedOpenTasks = [...openTasks].sort(compareTasks);
  const overdue = sortedOpenTasks.filter((task) => {
    const date = taskDate(task);
    return Boolean(date && date < today);
  });
  const dueToday = sortedOpenTasks.filter((task) => taskDate(task) === today);
  const upcoming = sortedOpenTasks.filter((task) => {
    const date = taskDate(task);
    return Boolean(date && date > today);
  });

  const activeProjects = projects.filter(
    (project) => isActiveProject(project) && matchesOrgContext(project.orgId, ctx),
  );
  const projectSummaries = activeProjects
    .map((project): WorkProjectSummary => {
      const projectTasks = visibleTasks.filter((task) => task.projectId === project.id);
      const completedTasks = projectTasks.filter((task) => task.status === 'done').length;
      const projectOpenTasks = projectTasks.length - completedTasks;
      const totalTasks = completedTasks + projectOpenTasks;
      return {
        project,
        openTasks: projectOpenTasks,
        completedTasks,
        completionPct: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      };
    })
    .sort(projectOrder);

  return {
    overdue: overdue.slice(0, 8),
    today: dueToday.slice(0, 8),
    upcoming: upcoming.slice(0, 8),
    projects: projectSummaries.slice(0, 6),
    counts: {
      openTasks: openTasks.length,
      overdue: overdue.length,
      today: dueToday.length,
      activeProjects: activeProjects.length,
    },
  };
}
