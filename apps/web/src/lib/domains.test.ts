import { describe, expect, it } from 'vitest';
import type { Project, Task } from '@ops-dashboard/core';
import { compareDomains, countDomainWork } from './domains';

const projects = [
  { id: 'project-1', domainId: 'domain-1', status: 'active' },
  { id: 'project-2', domainId: 'domain-2', status: 'active' },
] as Project[];

const tasks = [
  { id: 'direct', domainId: 'domain-1', status: 'todo' },
  { id: 'inherited', projectId: 'project-1', status: 'doing' },
  { id: 'other', projectId: 'project-2', status: 'todo' },
  { id: 'done', projectId: 'project-1', status: 'done' },
] as Task[];

describe('countDomainWork', () => {
  it('counts direct and project-inherited open tasks', () => {
    expect(countDomainWork('domain-1', projects, tasks)).toEqual({ projects: 1, tasks: 2 });
  });

  it('excludes tasks whose project is inactive', () => {
    const archivedProject = {
      id: 'project-archived',
      domainId: 'domain-1',
      status: 'archived',
    } as Project;
    const attachedTask = {
      id: 'attached',
      projectId: archivedProject.id,
      domainId: 'domain-1',
      status: 'todo',
    } as Task;

    expect(
      countDomainWork('domain-1', [...projects, archivedProject], [...tasks, attachedTask]),
    ).toEqual({
      projects: 1,
      tasks: 2,
    });
  });
});

describe('compareDomains', () => {
  it('puts valid orders first and stabilizes malformed ties', () => {
    const domains = [
      { id: 'invalid', name: 'Zeta', order: Number.NaN },
      { id: 'later', name: 'Beta', order: 2 },
      { id: 'first', name: 'Alpha', order: 1 },
    ];

    expect(domains.sort(compareDomains).map((domain) => domain.id)).toEqual([
      'first',
      'later',
      'invalid',
    ]);
  });

  it('does not throw when synced domain text is malformed', () => {
    const domains = [
      { id: null as never, name: null as never, order: Number.NaN },
      { id: 'valid', name: 'Alpha', order: Number.NaN },
    ];

    expect(() => domains.sort(compareDomains)).not.toThrow();
    expect(domains.map((domain) => domain.id)).toEqual([null, 'valid']);
  });
});
