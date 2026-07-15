import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  put: vi.fn(),
  enqueueOp: vi.fn(),
}));

vi.mock('@ops-dashboard/core', async () => {
  const actual = await vi.importActual<typeof import('@ops-dashboard/core')>(
    '@ops-dashboard/core',
  );
  return {
    ...actual,
    getDb: () => ({ projects: { count: mocks.count, put: mocks.put } }),
    getDeviceId: () => 'device-test',
    newId: () => 'project-test',
  };
});

vi.mock('./sync-queue', () => ({ enqueueOp: mocks.enqueueOp }));

import { createProject } from './projects';

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
