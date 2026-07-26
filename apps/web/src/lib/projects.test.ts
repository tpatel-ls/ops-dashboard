import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@ops-dashboard/core';

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  put: vi.fn(),
  enqueueOp: vi.fn(),
}));

vi.mock('@ops-dashboard/core', async () => {
  const actual = await vi.importActual<typeof import('@ops-dashboard/core')>('@ops-dashboard/core');
  return {
    ...actual,
    getDb: () => ({ projects: { count: mocks.count, put: mocks.put } }),
    getDeviceId: () => 'device-test',
    newId: () => 'project-test',
  };
});

vi.mock('./sync-queue', () => ({ enqueueOp: mocks.enqueueOp }));

import { createProject, projectTaskProgress } from './projects';

function task(id: string, patch: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    status: 'todo',
    priority: 0,
    tags: [],
    reminders: [],
    checklist: [],
    order: 0,
    createdAt: '2026-07-26T12:00:00.000Z',
    updatedAt: '2026-07-26T12:00:00.000Z',
    version: 1,
    deviceId: 'test',
    ...patch,
  };
}

describe('projectTaskProgress', () => {
  it('counts only live tasks in the selected project', () => {
    const result = projectTaskProgress(
      [
        task('open', { projectId: 'project-a' }),
        task('done', { projectId: 'project-a', status: 'done' }),
        task('archived', { projectId: 'project-a', status: 'archived' }),
        task('deleted', { projectId: 'project-a', deletedAt: '2026-07-26' }),
        task('other', { projectId: 'project-b' }),
      ],
      'project-a',
    );

    expect(result).toEqual({ open: 1, done: 1, total: 2, percent: 50 });
  });

  it('returns zero progress for a project without tasks', () => {
    expect(projectTaskProgress([], 'project-a')).toEqual({
      open: 0,
      done: 0,
      total: 0,
      percent: 0,
    });
  });
});

describe('createProject', () => {
  beforeEach(() => {
    mocks.count.mockReset().mockResolvedValue(0);
    mocks.put.mockReset().mockResolvedValue(undefined);
    mocks.enqueueOp.mockReset().mockResolvedValue(undefined);
  });

  it('keeps the selected organization and due date', async () => {
    const project = await createProject('Launch', {
      orgId: 'org-a',
      dueDate: '2026-08-01',
    });

    expect(project).toMatchObject({
      id: 'project-test',
      name: 'Launch',
      orgId: 'org-a',
      dueDate: '2026-08-01',
    });
    expect(mocks.put).toHaveBeenCalledWith(project);
    expect(mocks.enqueueOp).toHaveBeenCalledWith(
      expect.objectContaining({ table: 'projects', recordId: project.id, payload: project }),
    );
  });

  it('trims project names before writing', async () => {
    const project = await createProject('  Launch plan  ');

    expect(project.name).toBe('Launch plan');
    expect(mocks.put).toHaveBeenCalledWith(project);
  });

  it('rejects blank project names before writing', async () => {
    await expect(createProject('   ')).rejects.toThrow('Project name is required');
    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.enqueueOp).not.toHaveBeenCalled();
  });
});
