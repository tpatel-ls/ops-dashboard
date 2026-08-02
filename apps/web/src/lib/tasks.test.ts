import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project, Task } from '@ops-dashboard/core';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  last: vi.fn(),
  put: vi.fn(),
  enqueueOp: vi.fn(),
}));

vi.mock('@ops-dashboard/core', async () => {
  const actual = await vi.importActual<typeof import('@ops-dashboard/core')>('@ops-dashboard/core');
  return {
    ...actual,
    getDb: () => ({
      tasks: {
        get: mocks.get,
        put: mocks.put,
        orderBy: () => ({ last: mocks.last }),
      },
    }),
    getDeviceId: () => 'device-test',
    newId: () => 'task-test',
  };
});

vi.mock('./sync-queue', () => ({ enqueueOp: mocks.enqueueOp }));

import { addTaskToProject, setTaskStatus, updateTask } from './tasks';

describe('addTaskToProject', () => {
  it('keeps capture metadata while enforcing the project context', async () => {
    mocks.last.mockResolvedValue({ order: 3 });

    const task = await addTaskToProject(
      'Prepare launch',
      {
        id: 'project-1',
        domainId: 'domain-1',
        orgId: 'org-1',
      } as Project,
      {
        priority: 3,
        tags: ['launch'],
        notes: 'Confirm the final checklist',
        projectId: 'wrong-project',
      },
    );

    expect(task).toMatchObject({
      projectId: 'project-1',
      domainId: 'domain-1',
      orgId: 'org-1',
      priority: 3,
      tags: ['launch'],
      notes: 'Confirm the final checklist',
      order: 4,
    });
  });
});

describe('updateTask', () => {
  beforeEach(() => {
    mocks.get.mockReset().mockResolvedValue({
      id: 'task-1',
      title: 'Original',
      status: 'todo',
      priority: 0,
      tags: [],
      reminders: [],
      checklist: [],
      order: 1,
      createdAt: '2026-07-01T12:00:00.000Z',
      updatedAt: '2026-07-02T12:00:00.000Z',
      version: 4,
      deviceId: 'device-original',
    } satisfies Task);
    mocks.put.mockReset();
    mocks.enqueueOp.mockReset();
  });

  it('does not let callers replace immutable sync metadata', async () => {
    await updateTask('task-1', {
      id: 'task-other',
      title: 'Updated',
      createdAt: '2000-01-01T00:00:00.000Z',
      updatedAt: '2000-01-01T00:00:00.000Z',
      version: 99,
      deviceId: 'device-other',
    });

    expect(mocks.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'task-1',
        title: 'Updated',
        createdAt: '2026-07-01T12:00:00.000Z',
        version: 5,
        deviceId: 'device-original',
      }),
    );
    expect(mocks.enqueueOp).toHaveBeenCalledWith(expect.objectContaining({ recordId: 'task-1' }));
  });
});

describe('setTaskStatus', () => {
  it('does not duplicate work when the task already has that status', async () => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({
      id: 'task-1',
      title: 'Recurring task',
      status: 'done',
      priority: 0,
      tags: [],
      reminders: [],
      checklist: [],
      order: 1,
      recurrence: { freq: 'daily', interval: 1 },
      completedAt: '2026-08-01T12:00:00.000Z',
      createdAt: '2026-07-01T12:00:00.000Z',
      updatedAt: '2026-08-01T12:00:00.000Z',
      version: 5,
      deviceId: 'device-original',
    } satisfies Task);

    await setTaskStatus('task-1', 'done');

    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.enqueueOp).not.toHaveBeenCalled();
  });
});
