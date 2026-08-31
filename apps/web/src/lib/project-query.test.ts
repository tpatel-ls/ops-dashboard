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

  it('matches canonically equivalent Unicode text', () => {
    const unicodeProject = project({
      name: 'Caf\u00e9 Launch',
      description: 'Coordinate with ＬＳ Global',
    });

    expect(matchesProjectSearch(unicodeProject, 'Cafe\u0301')).toBe(true);
    expect(matchesProjectSearch(unicodeProject, 'LS global')).toBe(true);
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

  it('treats impossible project deadlines as undated', () => {
    const valid = project({ id: 'valid', name: 'Valid', dueDate: '2026-03-01' });
    const malformed = project({ id: 'malformed', name: 'Malformed', dueDate: '2026-02-30' });

    expect([malformed, valid].sort((a, b) => compareProjects(a, b, 'due'))).toEqual([
      valid,
      malformed,
    ]);
  });

  it('sorts recently worked projects first', () => {
    expect([alpha, gamma, beta].sort((a, b) => compareProjects(a, b, 'recent'))).toEqual([
      beta,
      gamma,
      alpha,
    ]);
  });

  it('uses ids to break otherwise identical ties', () => {
    const projects = [project({ id: 'z', name: 'Same' }), project({ id: 'a', name: 'Same' })];

    expect(projects.sort((a, b) => compareProjects(a, b, 'name')).map((item) => item.id)).toEqual([
      'a',
      'z',
    ]);
  });

  it('sorts recent activity by instant and puts malformed timestamps last', () => {
    const latest = project({
      id: 'latest',
      name: 'Latest',
      lastWorkedAt: '2026-07-15T10:00:00-05:00',
    });
    const earlier = project({
      id: 'earlier',
      name: 'Earlier',
      lastWorkedAt: '2026-07-15T14:30:00Z',
    });
    const malformed = project({
      id: 'malformed',
      name: 'Malformed',
      lastWorkedAt: 'not-a-timestamp',
    });

    expect([malformed, earlier, latest].sort((a, b) => compareProjects(a, b, 'recent'))).toEqual([
      latest,
      earlier,
      malformed,
    ]);
  });
});
