import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@ops-dashboard/core';

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  enqueueOp: vi.fn(),
}));

vi.mock('@ops-dashboard/core', async () => {
  const actual = await vi.importActual<typeof import('@ops-dashboard/core')>('@ops-dashboard/core');
  return {
    ...actual,
    getDb: () => ({
      projects: { count: mocks.count, get: mocks.get, put: mocks.put },
      table: () => ({ get: mocks.get, put: mocks.put }),
    }),
    getDeviceId: () => 'device-test',
    newId: () => 'project-test',
  };
});

vi.mock('./sync-queue', () => ({ enqueueOp: mocks.enqueueOp }));

import {
  archiveProject,
  createProject,
  projectTaskProgress,
  renameProject,
  updateProject,
} from './projects';

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

  it('normalizes optional project fields', async () => {
    const project = await createProject('Launch', {
      color: '  #123  ',
      orgId: '  org-a  ',
      domainId: '  domain-a  ',
      description: '  Release plan  ',
      dueDate: ' 2026-08-01 ',
    });

    expect(project).toMatchObject({
      color: '#123',
      orgId: 'org-a',
      domainId: 'domain-a',
      description: 'Release plan',
      dueDate: '2026-08-01',
    });
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

  it('rejects impossible due dates before writing', async () => {
    await expect(createProject('Launch', { dueDate: '2026-02-30' })).rejects.toThrow(
      'Project due date must be a valid calendar date',
    );
    expect(mocks.count).not.toHaveBeenCalled();
    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.enqueueOp).not.toHaveBeenCalled();
  });

  it('rejects malformed project kinds and colors before writing', async () => {
    await expect(createProject('Launch', { kind: 'campaign' as never })).rejects.toThrow(
      'Project kind must be valid',
    );
    await expect(createProject('Launch', { color: '   ' })).rejects.toThrow(
      'Project color is required',
    );
    expect(mocks.count).not.toHaveBeenCalled();
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it('does not rename a deleted project', async () => {
    mocks.get.mockResolvedValue({
      id: 'project-test',
      deletedAt: '2026-08-03T12:00:00.000Z',
    });

    await renameProject('project-test', 'New name');

    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.enqueueOp).not.toHaveBeenCalled();
  });
});

describe('archiveProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([{ deletedAt: '2026-08-03T12:00:00.000Z' }, { archivedAt: '2026-08-03T12:00:00.000Z' }])(
    'does not rewrite an unavailable project',
    async (state) => {
      mocks.get.mockResolvedValue({ id: 'project-test', ...state });

      await archiveProject('project-test');

      expect(mocks.put).not.toHaveBeenCalled();
      expect(mocks.enqueueOp).not.toHaveBeenCalled();
    },
  );
});

describe('renameProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({
      id: 'project-test',
      name: 'Old name',
      color: '#fff',
      kind: 'project',
      status: 'active',
      milestones: [],
      checklists: [],
      createdAt: '2026-07-01T12:00:00.000Z',
      updatedAt: '2026-07-01T12:00:00.000Z',
      version: 1,
      deviceId: 'device-test',
    });
  });

  it('trims a usable project name', async () => {
    await renameProject('project-test', '  New name  ');

    expect(mocks.put).toHaveBeenCalledWith(expect.objectContaining({ name: 'New name' }));
  });

  it('repairs a malformed version while renaming', async () => {
    mocks.get.mockResolvedValue({
      id: 'project-test',
      name: 'Old name',
      version: Number.POSITIVE_INFINITY,
      updatedAt: 'not-a-date',
    });

    await renameProject('project-test', 'New name');

    expect(mocks.put).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New name', version: 1 }),
    );
  });

  it('rejects blank project names before writing', async () => {
    await expect(renameProject('project-test', '   ')).rejects.toThrow('Project name is required');
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it('does not sync a rename that changes only surrounding whitespace', async () => {
    await renameProject('project-test', '  Old name  ');

    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.enqueueOp).not.toHaveBeenCalled();
  });
});

describe('updateProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({
      id: 'project-test',
      name: 'Launch',
      color: '#fff',
      kind: 'project',
      status: 'active',
      milestones: [],
      checklists: [],
      createdAt: '2026-07-01T12:00:00.000Z',
      updatedAt: '2026-07-01T12:00:00.000Z',
      version: 1,
      deviceId: 'device-test',
    });
  });

  it('normalizes project detail edits', async () => {
    await updateProject('project-test', {
      name: '  Launch plan  ',
      description: '  Release scope  ',
      dueDate: '2026-08-20',
    });

    expect(mocks.put).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Launch plan',
        description: 'Release scope',
        dueDate: '2026-08-20',
      }),
    );
  });

  it('rejects invalid project detail values', () => {
    expect(() => updateProject('project-test', { status: 'missing' as never })).toThrow(
      'Project status must be valid',
    );
    expect(() => updateProject('project-test', { dueDate: '2026-02-30' })).toThrow(
      'Project dueDate must be a valid calendar date',
    );
    expect(() => updateProject('project-test', { retainerResetDay: 31 })).toThrow(
      'Project retainer reset day must be from 1 to 28',
    );
  });

  it('normalizes milestone edits before persistence', async () => {
    await updateProject('project-test', {
      milestones: [
        { id: ' milestone-1 ', title: ' Ship launch ', done: false, dueAt: '2026-08-20' },
      ],
    });

    expect(mocks.put).toHaveBeenCalledWith(
      expect.objectContaining({
        milestones: [{ id: 'milestone-1', title: 'Ship launch', done: false, dueAt: '2026-08-20' }],
      }),
    );
  });

  it('rejects malformed milestones and duplicate identifiers', () => {
    expect(() =>
      updateProject('project-test', {
        milestones: [{ id: 'milestone-1', title: 'Ship', done: false, dueAt: '2026-02-30' }],
      }),
    ).toThrow('Project milestones must be valid');
    expect(() =>
      updateProject('project-test', {
        milestones: [
          { id: 'milestone-1', title: 'Ship', done: false },
          { id: ' milestone-1 ', title: 'Review', done: true },
        ],
      }),
    ).toThrow('Project milestones must be valid');
  });
});
