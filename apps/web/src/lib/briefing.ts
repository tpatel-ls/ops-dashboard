import { localDay, todayIso } from '@ops-dashboard/core';
import type { Capture, Domain, Project, Task } from '@ops-dashboard/core';
import { differenceInCalendarDays } from 'date-fns';

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
  const requestedStaleDays = input.staleAfterDays ?? 7;
  const staleAfterDays =
    Number.isFinite(requestedStaleDays) && requestedStaleDays >= 0
      ? Math.min(3650, Math.floor(requestedStaleDays))
      : 7;
  const nowMs = now.getTime();
  const deletedOrArchived = (d: Domain) => Boolean(d.deletedAt || d.archivedAt);

  return input.domains
    .filter((domain) => !deletedOrArchived(domain))
    .map((domain) => {
      const connectedProjectDates = input.projects
        .filter(
          (project) =>
            !project.deletedAt &&
            !project.archivedAt &&
            project.status !== 'archived' &&
            project.domainId === domain.id,
        )
        .flatMap((project) => [project.lastWorkedAt, project.updatedAt, project.createdAt])
        .filter(Boolean) as string[];
      const connectedTaskDates = input.tasks
        .filter(
          (task) => !task.deletedAt && task.status !== 'archived' && task.domainId === domain.id,
        )
        .flatMap((task) => [task.completedAt, task.updatedAt, task.createdAt])
        .filter(Boolean) as string[];
      const candidates = [
        domain.updatedAt,
        domain.createdAt,
        ...connectedProjectDates,
        ...connectedTaskDates,
      ]
        .filter(Boolean)
        .filter((value) => {
          const timestamp = Date.parse(value);
          return Number.isFinite(timestamp) && timestamp <= nowMs;
        })
        .sort((a, b) => Date.parse(b) - Date.parse(a));
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
        differenceInCalendarDays(now, new Date(lastTouchedAt)),
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

export function findCaptureRoutingIssues(
  captures: Capture[],
  tasks: Task[],
): CaptureRoutingIssue[] {
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
    .sort((a, b) => {
      const aTimestamp = Date.parse(a.createdAt);
      const bTimestamp = Date.parse(b.createdAt);
      const aValid = Number.isFinite(aTimestamp);
      const bValid = Number.isFinite(bTimestamp);
      if (aValid && bValid && aTimestamp !== bTimestamp) return bTimestamp - aTimestamp;
      if (aValid !== bValid) return aValid ? -1 : 1;
      return a.captureId.localeCompare(b.captureId);
    });
}

export function summarizeBriefing(input: {
  tasks: Task[];
  today?: string;
  routingIssues: number;
  staleDomains: number;
}): BriefingSummary {
  const today = input.today ?? todayIso();
  const live = input.tasks.filter((task) => !task.deletedAt && task.status !== 'archived');
  const openToday = live.filter((task) => {
    if (task.status === 'done') return false;
    const scheduled = localDay(task.scheduledFor);
    const due = localDay(task.dueAt);
    return scheduled === today || Boolean(due && due <= today) || localDay(task.startAt) === today;
  });
  const doneToday = live.filter(
    (task) => task.status === 'done' && localDay(task.completedAt) === today,
  ).length;
  const overdue = live.filter((task) => {
    const due = localDay(task.dueAt);
    const scheduled = localDay(task.scheduledFor);
    return (
      task.status !== 'done' && Boolean((due && due < today) || (scheduled && scheduled < today))
    );
  }).length;

  return {
    todayTotal: openToday.length + doneToday,
    doneToday,
    openToday: openToday.length,
    overdue,
    routingIssues: input.routingIssues,
    staleDomains: input.staleDomains,
  };
}
