import { describe, expect, it } from 'vitest';
import type { Domain, Organization, Project, Task } from '@ops-dashboard/core';
import { buildWorkContext } from './ask-context';

const organizations = [{ id: 'org-lsg', name: 'LSG' }] as Organization[];
const domains = [{ id: 'domain-sales', name: 'Sales' }] as Domain[];
const projects = [
  {
    id: 'project-dialer',
    name: 'Power Dialer',
    status: 'active',
    kind: 'project',
    orgId: 'org-lsg',
    domainId: 'domain-sales',
  },
] as Project[];
const tasks = [
  {
    id: 'task-blue-texting',
    title: 'Make blue texting airtight',
    status: 'todo',
    priority: 3,
    projectId: 'project-dialer',
    orgId: 'org-lsg',
    tags: ['dialer'],
  },
  { id: 'task-done', title: 'Finished task', status: 'done', priority: 0, tags: [] },
] as Task[];

describe('buildWorkContext', () => {
  it('connects organizations, projects, domains, and open tasks', () => {
    const context = buildWorkContext({ tasks, projects, domains, organizations });

    expect(context).toContain('=== ORGANIZATIONS ===');
    expect(context).toContain('organization:LSG');
    expect(context).toContain('project:Power Dialer');
    expect(context).toContain('domain:Sales');
    expect(context).toContain('Make blue texting airtight');
    expect(context).not.toContain('Finished task');
  });

  it('does not expose unavailable relationship names through open tasks', () => {
    const context = buildWorkContext({
      tasks: [
        {
          ...tasks[0]!,
          projectId: 'project-deleted',
          orgId: 'org-deleted',
          domainId: 'domain-archived',
        },
      ],
      projects: [
        {
          ...projects[0]!,
          id: 'project-deleted',
          name: 'Deleted project secret',
          deletedAt: '2026-08-25T12:00:00.000Z',
        },
      ],
      domains: [
        {
          ...domains[0]!,
          id: 'domain-archived',
          name: 'Archived domain secret',
          archivedAt: '2026-08-25T12:00:00.000Z',
        },
      ],
      organizations: [
        {
          ...organizations[0]!,
          id: 'org-deleted',
          name: 'Deleted organization secret',
          deletedAt: '2026-08-25T12:00:00.000Z',
        },
      ],
    });

    expect(context).toContain('Make blue texting airtight');
    expect(context).not.toContain('secret');
  });
});
