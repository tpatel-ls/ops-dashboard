import { describe, expect, it } from 'vitest';
import type { Project } from '@ops-dashboard/core';
import { resolveRecentProject, taskCaptureOverrides } from './task-capture';

function project(id: string, orgId?: string, patch: Partial<Project> = {}): Project {
  const now = '2026-07-16T12:00:00.000Z';
  return {
    id,
    name: id,
    color: '#fff',
    kind: 'project',
    status: 'active',
    ...(orgId ? { orgId } : {}),
    milestones: [],
    checklists: [],
    createdAt: now,
    updatedAt: now,
    version: 1,
    deviceId: 'test',
    ...patch,
  };
}

describe('resolveRecentProject', () => {
  it('restores a valid project in the selected destination', () => {
    const personal = project('personal');
    const work = project('work', 'org-a');

    expect(resolveRecentProject([personal, work], 'org-a', work.id)).toEqual(work);
    expect(resolveRecentProject([personal, work], 'personal', personal.id)).toEqual(personal);
  });

  it('rejects projects from another destination', () => {
    const work = project('work', 'org-a');

    expect(resolveRecentProject([work], 'personal', work.id)).toBeUndefined();
    expect(resolveRecentProject([work], 'org-b', work.id)).toBeUndefined();
  });

  it('rejects archived and completed projects', () => {
    const archived = project('archived', 'org-a', { archivedAt: '2026-07-16T13:00:00.000Z' });
    const done = project('done', 'org-a', { status: 'done' });

    expect(resolveRecentProject([archived, done], 'org-a', archived.id)).toBeUndefined();
    expect(resolveRecentProject([archived, done], 'org-a', done.id)).toBeUndefined();
  });
});

describe('taskCaptureOverrides', () => {
  it('inherits project, organization, and domain from a selected project', () => {
    const work = project('work', 'org-a', { domainId: 'domain-a' });

    expect(taskCaptureOverrides('personal', work, '2026-07-16', 2)).toEqual({
      projectId: 'work',
      orgId: 'org-a',
      domainId: 'domain-a',
      scheduledFor: '2026-07-16',
      priority: 2,
    });
  });

  it('uses the destination when no project is selected', () => {
    expect(taskCaptureOverrides('org-a', undefined, undefined, 0)).toEqual({
      orgId: 'org-a',
      priority: 0,
    });
    expect(taskCaptureOverrides('personal', undefined, undefined, 3)).toEqual({
      priority: 3,
    });
  });
});
