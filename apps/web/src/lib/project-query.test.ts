import { describe, expect, it } from 'vitest';
import type { Project } from '@ops-dashboard/core';
import { compareProjects, isActiveProject, matchesProjectSearch } from './project-query';

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

describe('matchesProjectSearch', () => {
  const launch = project({ name: 'Cross-device Launch', description: 'Ship the mobile rollout' });

  it('matches names and descriptions without case sensitivity', () => {
    expect(matchesProjectSearch(launch, 'DEVICE')).toBe(true);
    expect(matchesProjectSearch(launch, 'mobile')).toBe(true);
    expect(matchesProjectSearch(launch, 'billing')).toBe(false);
  });

  it('keeps every project for an empty query', () => {
    expect(matchesProjectSearch(launch, '  ')).toBe(true);
  });
});

describe('compareProjects', () => {
  const alpha = project({ id: 'alpha', name: 'Alpha', dueDate: '2026-08-01' });
  const beta = project({
    id: 'beta',
    name: 'Beta',
    dueDate: '2026-07-20',
    lastWorkedAt: '2026-07-15T15:00:00.000Z',
  });
  const gamma = project({
    id: 'gamma',
    name: 'Gamma',
    lastWorkedAt: '2026-07-14T15:00:00.000Z',
  });

  it('sorts by name', () => {
    expect([gamma, beta, alpha].sort((a, b) => compareProjects(a, b, 'name'))).toEqual([
      alpha,
      beta,
      gamma,
    ]);
  });

  it('sorts dated projects first by due date', () => {
    expect([gamma, alpha, beta].sort((a, b) => compareProjects(a, b, 'due'))).toEqual([
      beta,
      alpha,
      gamma,
    ]);
  });

  it('sorts recently worked projects first', () => {
    expect([alpha, gamma, beta].sort((a, b) => compareProjects(a, b, 'recent'))).toEqual([
      beta,
      gamma,
      alpha,
    ]);
  });
});
