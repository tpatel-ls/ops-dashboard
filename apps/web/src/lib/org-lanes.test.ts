import { describe, expect, it } from 'vitest';
import type { Organization, Project, Task } from '@ops-dashboard/core';
import { compareOrganizations, taskLane } from './org-lanes';

describe('taskLane', () => {
  it('stabilizes organization ordering when synced fields are malformed', () => {
    const organizations = [
      { id: 'z', name: null, order: Number.NaN },
      { id: 'a', name: 'Alpha', order: 1 },
      { id: 'b', name: 'Beta', order: 1 },
    ] as Organization[];
    expect(organizations.sort(compareOrganizations).map((organization) => organization.id)).toEqual(
      ['z', 'a', 'b'],
    );
  });

  it('trims the project reference before lookup', () => {
    const projects = new Map<string, Project>([
      ['project-1', { id: 'project-1', orgId: 'org-1' } as Project],
    ]);
    expect(taskLane({ projectId: ' project-1 ' } as Task, projects)).toBe('org-1');
  });
  it('prefers a normalized task organization', () => {
    const projects = new Map<string, Project>([
      ['project-1', { id: 'project-1', orgId: 'project-org' } as Project],
    ]);

    expect(taskLane({ orgId: ' task-org ', projectId: 'project-1' } as Task, projects)).toBe(
      'task-org',
    );
  });

  it('falls back through the project for blank legacy organization ids', () => {
    const projects = new Map<string, Project>([
      ['project-1', { id: 'project-1', orgId: ' project-org ' } as Project],
    ]);

    expect(taskLane({ orgId: '   ', projectId: ' project-1 ' } as Task, projects)).toBe(
      'project-org',
    );
  });

  it('keeps tasks with unusable references in the personal lane', () => {
    expect(taskLane({ orgId: ' ', projectId: ' ' } as Task, new Map())).toBeUndefined();
  });

  it('keeps a task personal when its legacy project has no organization', () => {
    const projects = new Map<string, Project>([
      ['project-1', { id: 'project-1', orgId: '   ' } as Project],
    ]);

    expect(taskLane({ projectId: 'project-1' } as Task, projects)).toBeUndefined();
  });

  it('ignores malformed synced organization references', () => {
    const projects = new Map<string, Project>([
      ['project-1', { id: 'project-1', orgId: 42 } as unknown as Project],
    ]);

    expect(taskLane({ orgId: 42, projectId: 'project-1' } as unknown as Task, projects)).toBe(
      undefined,
    );
  });
});
