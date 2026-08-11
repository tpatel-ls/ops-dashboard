import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project, Task } from '@ops-dashboard/core';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  last: vi.fn(),
  put: vi.fn(),
  bulkPutReminders: vi.fn(),
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
      reminders: { bulkPut: mocks.bulkPutReminders },
    }),
    getDeviceId: () => 'device-test',
    newId: () => 'task-test',
  };
});

vi.mock('./sync-queue', () => ({ enqueueOp: mocks.enqueueOp }));

import {
  addTask,
  addTaskToProject,
  projectRecurringReminders,
  setTaskStatus,
  softDeleteTask,
  updateTask,
} from './tasks';

describe('addTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.last.mockResolvedValue({ order: 3 });
  });

  it('rejects a blank title before opening the database', async () => {
    await expect(addTask('   ')).rejects.toThrow('Task title is required');
    expect(mocks.last).not.toHaveBeenCalled();
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it('does not let creation overrides replace identity or sync metadata', async () => {
    const task = await addTask('Created task', {
      id: 'wrong-id',
      title: 'Wrong title',
      createdAt: '2000-01-01T00:00:00.000Z',
      updatedAt: '2000-01-01T00:00:00.000Z',
      version: 99,
      deviceId: 'wrong-device',
      deletedAt: '2000-01-01T00:00:00.000Z',
    });

    expect(task).toMatchObject({
      id: 'task-test',
      title: 'Created task',
      version: 1,
      deviceId: 'device-test',
    });
    expect(task.deletedAt).toBeUndefined();
    expect(task.createdAt).not.toBe('2000-01-01T00:00:00.000Z');
  });

  it('recovers when the last stored task has a malformed order', async () => {
    mocks.last.mockResolvedValue({ order: Number.POSITIVE_INFINITY });

    await expect(addTask('Ordered task')).resolves.toMatchObject({ order: 1 });
  });
});

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
      deletedAt: '2000-01-01T00:00:00.000Z',
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
    expect(mocks.put.mock.calls[0]?.[0]).not.toHaveProperty('deletedAt');
    expect(mocks.enqueueOp).toHaveBeenCalledWith(expect.objectContaining({ recordId: 'task-1' }));
  });

  it('normalizes titles and rejects malformed editable fields', async () => {
    await updateTask('task-1', { title: '  Updated title  ' });
    expect(mocks.put).toHaveBeenCalledWith(expect.objectContaining({ title: 'Updated title' }));

    for (const patch of [
      { title: '   ' },
      { scheduledFor: '2026-02-30' },
      { dueAt: 'not-a-date' },
      { estimateMinutes: -1 },
      { actualMinutes: 1.5 },
      { order: Number.NaN },
    ] satisfies Partial<Task>[]) {
      mocks.put.mockClear();
      await expect(updateTask('task-1', patch)).rejects.toThrow();
      expect(mocks.put).not.toHaveBeenCalled();
    }
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

  it('moves reminders onto the next recurring task', async () => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({
      id: 'task-1',
      title: 'Daily planning',
      status: 'todo',
      priority: 0,
      scheduledFor: '2026-08-01',
      tags: [],
      reminders: [
        {
          id: 'reminder-old',
          taskId: 'task-1',
          triggerAt: '2026-08-01T13:00:00.000Z',
          delivered: true,
        },
      ],
      checklist: [],
      order: 1,
      recurrence: { freq: 'daily', interval: 1 },
      createdAt: '2026-08-01T12:00:00.000Z',
      updatedAt: '2026-08-01T12:00:00.000Z',
      version: 1,
      deviceId: 'device-original',
    } satisfies Task);
    mocks.last.mockResolvedValue({ order: 1 });

    await setTaskStatus('task-1', 'done');

    expect(mocks.bulkPutReminders).toHaveBeenCalledWith([
      expect.objectContaining({
        taskId: 'task-test',
        triggerAt: '2026-08-02T13:00:00.000Z',
        delivered: false,
      }),
    ]);
    expect(mocks.put).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 'task-test',
        reminders: [expect.objectContaining({ taskId: 'task-test' })],
      }),
    );
  });
});

describe('softDeleteTask', () => {
  it('does not create another operation for a deleted task', async () => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({ id: 'task-1', deletedAt: '2026-08-01T12:00:00.000Z' });

    await softDeleteTask('task-1');

    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.enqueueOp).not.toHaveBeenCalled();
  });
});

describe('projectRecurringReminders', () => {
  it('drops shifted reminders that overflow the JavaScript date range', () => {
    const previous = {
      scheduledFor: '2026-08-01',
      reminders: [
        {
          id: 'reminder-old',
          taskId: 'task-old',
          triggerAt: '+275760-09-12T00:00:00.000Z',
          delivered: false,
        },
      ],
    } as Task;
    const projected = { scheduledFor: '2026-08-03' } as Task;

    expect(projectRecurringReminders(previous, projected, 'task-new')).toEqual([]);
  });
});
