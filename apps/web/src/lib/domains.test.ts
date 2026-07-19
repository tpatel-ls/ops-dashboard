import { describe, expect, it } from 'vitest';
import type { Project, Task } from '@ops-dashboard/core';
import { countDomainWork } from './domains';

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
});
