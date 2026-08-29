import { describe, expect, it } from 'vitest';
import type { Project, Task } from '@ops-dashboard/core';
import { taskLane } from './org-lanes';

describe('taskLane', () => {
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
});
