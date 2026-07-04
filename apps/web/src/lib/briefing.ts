import type { Capture, Domain, Project, Task } from '@ops-dashboard/core';

export interface StaleDomain {
  domainId: string;
  domainName: string;
  color: string;
  daysIdle: number;
  lastTouchedAt?: string;
  reason: 'never-touched' | 'stale';
}

export interface CaptureRoutingIssue {
  captureId: string;
  title: string;
  source: Capture['source'];
  reason: 'unprocessed' | 'missing-context' | 'missing-record';
  createdAt: string;
}

export interface BriefingSummary {
  todayTotal: number;
  doneToday: number;
  openToday: number;
  overdue: number;
  routingIssues: number;
  staleDomains: number;
}

export function findStaleDomains(input: {
  domains: Domain[];
  projects: Project[];
  tasks: Task[];
  now?: Date;
  staleAfterDays?: number;
}): StaleDomain[] {
  const now = input.now ?? new Date();
  const staleAfterDays = input.staleAfterDays ?? 7;
  const nowMs = now.getTime();
  const deletedOrArchived = (d: Domain) => Boolean(d.deletedAt || d.archivedAt);

  return input.domains
    .filter((domain) => !deletedOrArchived(domain))
    .map((domain) => {
      const connectedProjectDates = input.projects
        .filter((project) => !project.deletedAt && !project.archivedAt && project.domainId === domain.id)
        .flatMap((project) => [project.lastWorkedAt, project.updatedAt, project.createdAt])
        .filter(Boolean) as string[];
      const connectedTaskDates = input.tasks
        .filter((task) => !task.deletedAt && task.domainId === domain.id)
        .flatMap((task) => [task.completedAt, task.updatedAt, task.createdAt])
        .filter(Boolean) as string[];
      const candidates = [domain.updatedAt, domain.createdAt, ...connectedProjectDates, ...connectedTaskDates]
        .filter(Boolean)
        .sort((a, b) => b.localeCompare(a));
      const lastTouchedAt = candidates[0];
      if (!lastTouchedAt) {
        return {
          domainId: domain.id,
          domainName: domain.name,
          color: domain.color,
          daysIdle: Number.POSITIVE_INFINITY,
          reason: 'never-touched' as const,
        };
      }

      const daysIdle = Math.max(
        0,
        Math.floor((nowMs - new Date(lastTouchedAt).getTime()) / 86_400_000),
      );
      return {
        domainId: domain.id,
        domainName: domain.name,
        color: domain.color,
        daysIdle,
        lastTouchedAt,
        reason: daysIdle > staleAfterDays ? ('stale' as const) : ('never-touched' as const),
      };
    })
    .filter((item) => item.daysIdle > staleAfterDays)
    .sort((a, b) => b.daysIdle - a.daysIdle || a.domainName.localeCompare(b.domainName));
}

export function findCaptureRoutingIssues(captures: Capture[], tasks: Task[]): CaptureRoutingIssue[] {
  const taskById = new Map(tasks.map((task) => [task.id, task]));

  return captures
    .filter((capture) => !capture.deletedAt && capture.status !== 'dismissed')
    .flatMap((capture): CaptureRoutingIssue[] => {
      const title = capture.aiSummary || capture.raw;
      if (capture.status === 'pending' || !capture.routedTo) {
        return [
          {
            captureId: capture.id,
            title,
            source: capture.source,
            reason: 'unprocessed',
            createdAt: capture.createdAt,
          },
        ];
      }

      if (capture.routedTo.type !== 'task') return [];
      const task = taskById.get(capture.routedTo.id);
      if (!task || task.deletedAt) {
        return [
          {
            captureId: capture.id,
            title,
            source: capture.source,
            reason: 'missing-record',
            createdAt: capture.createdAt,
          },
        ];
      }
      if (!task.domainId && !task.projectId) {
        return [
          {
            captureId: capture.id,
            title,
            source: capture.source,
            reason: 'missing-context',
            createdAt: capture.createdAt,
          },
        ];
      }
      return [];
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function summarizeBriefing(input: {
  tasks: Task[];
  today?: string;
  routingIssues: number;
  staleDomains: number;
}): BriefingSummary {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const live = input.tasks.filter((task) => !task.deletedAt && task.status !== 'archived');
  const todays = live.filter(
    (task) =>
      task.scheduledFor === today ||
      Boolean(task.dueAt && task.dueAt.slice(0, 10) <= today) ||
      Boolean(task.startAt && task.startAt.slice(0, 10) === today),
  );
  const doneToday = todays.filter((task) => task.status === 'done').length;
  const overdue = live.filter(
    (task) =>
      task.status !== 'done' &&
      ((task.dueAt && task.dueAt.slice(0, 10) < today) ||
        (task.scheduledFor && task.scheduledFor < today)),
  ).length;

  return {
    todayTotal: todays.length,
    doneToday,
    openToday: todays.length - doneToday,
    overdue,
    routingIssues: input.routingIssues,
    staleDomains: input.staleDomains,
  };
}
