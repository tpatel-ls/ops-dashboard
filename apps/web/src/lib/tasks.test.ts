import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@ops-dashboard/core';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  enqueueOp: vi.fn(),
}));

vi.mock('@ops-dashboard/core', async () => {
  const actual = await vi.importActual<typeof import('@ops-dashboard/core')>('@ops-dashboard/core');
  return {
    ...actual,
    getDb: () => ({ tasks: { get: mocks.get, put: mocks.put } }),
  };
});

vi.mock('./sync-queue', () => ({ enqueueOp: mocks.enqueueOp }));

import { updateTask } from './tasks';

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
    expect(mocks.enqueueOp).toHaveBeenCalledWith(
      expect.objectContaining({ recordId: 'task-1' }),
    );
  });
});
