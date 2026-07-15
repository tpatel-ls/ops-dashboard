import { describe, expect, it } from 'vitest';
import type { Project } from '@ops-dashboard/core';
import { isActiveProject } from './project-query';

function project(patch: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    name: 'Launch',
    color: '#fff',
    kind: 'project',
    status: 'active',
    milestones: [],
    checklists: [],
    createdAt: '2026-07-15T12:00:00.000Z',
    updatedAt: '2026-07-15T12:00:00.000Z',
    version: 1,
    deviceId: 'test',
    ...patch,
  };
}

describe('isActiveProject', () => {
  it('keeps active and paused projects available', () => {
    expect(isActiveProject(project())).toBe(true);
    expect(isActiveProject(project({ status: 'paused' }))).toBe(true);
  });

  it('excludes deleted, archived, and completed projects', () => {
    expect(isActiveProject(project({ deletedAt: '2026-07-15' }))).toBe(false);
    expect(isActiveProject(project({ archivedAt: '2026-07-15' }))).toBe(false);
    expect(isActiveProject(project({ status: 'done' }))).toBe(false);
    expect(isActiveProject(project({ status: 'archived' }))).toBe(false);
  });
});
