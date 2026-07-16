import { describe, expect, it } from 'vitest';
import type { Project, Task } from '@ops-dashboard/core';
import { buildWorkDashboard } from './work-dashboard';

function task(id: string, patch: Partial<Task> = {}): Task {
  const now = '2026-07-16T12:00:00.000Z';
  return {
    id,
    title: id,
    status: 'todo',
    priority: 0,
    tags: [],
    reminders: [],
    checklist: [],
    order: 1,
    createdAt: now,
    updatedAt: now,
    version: 1,
    deviceId: 'test',
    ...patch,
  };
}

function project(id: string, patch: Partial<Project> = {}): Project {
  const now = '2026-07-16T12:00:00.000Z';
  return {
    id,
    name: id,
    color: '#fff',
    kind: 'project',
    status: 'active',
    milestones: [],
    checklists: [],
    createdAt: now,
    updatedAt: now,
    version: 1,
    deviceId: 'test',
    ...patch,
  };
}

describe('buildWorkDashboard', () => {
  it('buckets open tasks by their effective date', () => {
    const result = buildWorkDashboard(
      [
        task('overdue', { scheduledFor: '2026-07-15' }),
        task('today', { dueAt: '2026-07-16T19:00:00.000Z' }),
        task('upcoming', { startAt: '2026-07-18T09:00:00.000Z' }),
        task('unscheduled'),
      ],
      [],
      'all',
      '2026-07-16',
    );

    expect(result.overdue.map((item) => item.id)).toEqual(['overdue']);
    expect(result.today.map((item) => item.id)).toEqual(['today']);
    expect(result.upcoming.map((item) => item.id)).toEqual(['upcoming']);
    expect(result.counts.openTasks).toBe(4);
  });

  it('excludes completed, archived, deleted, and out-of-context tasks', () => {
    const result = buildWorkDashboard(
      [
        task('visible', { orgId: 'org-a', scheduledFor: '2026-07-16' }),
        task('other-org', { orgId: 'org-b', scheduledFor: '2026-07-16' }),
        task('personal', { scheduledFor: '2026-07-16' }),
        task('done', { orgId: 'org-a', status: 'done', scheduledFor: '2026-07-16' }),
        task('archived', { orgId: 'org-a', status: 'archived', scheduledFor: '2026-07-16' }),
        task('deleted', { orgId: 'org-a', deletedAt: '2026-07-16', scheduledFor: '2026-07-16' }),
      ],
      [],
      'org-a',
      '2026-07-16',
    );

    expect(result.today.map((item) => item.id)).toEqual(['visible']);
    expect(result.counts.openTasks).toBe(1);
  });

  it('summarizes active projects and their completion ratios', () => {
    const active = project('active', { orgId: 'org-a', dueDate: '2026-07-20' });
    const paused = project('paused', { orgId: 'org-a', status: 'paused' });
    const doneProject = project('done-project', { orgId: 'org-a', status: 'done' });
    const result = buildWorkDashboard(
      [
        task('open', { orgId: 'org-a', projectId: active.id }),
        task('complete', { orgId: 'org-a', projectId: active.id, status: 'done' }),
        task('deleted', { orgId: 'org-a', projectId: active.id, deletedAt: '2026-07-16' }),
      ],
      [active, paused, doneProject],
      'org-a',
      '2026-07-16',
    );

    expect(result.projects.map((summary) => summary.project.id)).toEqual(['active', 'paused']);
    expect(result.projects[0]).toMatchObject({ openTasks: 1, completedTasks: 1, completionPct: 50 });
    expect(result.counts.activeProjects).toBe(2);
  });

  it('limits dashboard collections while keeping deterministic order', () => {
    const tasks = Array.from({ length: 12 }, (_, index) =>
      task(`task-${index}`, {
        title: `Task ${String(index).padStart(2, '0')}`,
        scheduledFor: '2026-07-16',
        order: index,
      }),
    );
    const projects = Array.from({ length: 9 }, (_, index) =>
      project(`project-${index}`, { name: `Project ${String(index).padStart(2, '0')}` }),
    );

    const result = buildWorkDashboard(tasks, projects, 'all', '2026-07-16');

    expect(result.today).toHaveLength(8);
    expect(result.projects).toHaveLength(6);
    expect(result.today[0]?.id).toBe('task-0');
    expect(result.projects[0]?.project.id).toBe('project-0');
  });
});
