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
    getDb: () => ({ table: () => ({ get: mocks.get, put: mocks.put }) }),
  };
});

vi.mock('./sync-queue', () => ({ enqueueOp: mocks.enqueueOp }));

import { patchRecord, softDeleteRecord } from './records';

describe('patchRecord', () => {
  beforeEach(() => {
    mocks.get.mockReset().mockResolvedValue({
      id: 'task-1',
      title: 'Original',
      createdAt: '2026-07-01T12:00:00.000Z',
      updatedAt: '2026-07-02T12:00:00.000Z',
      version: 4,
      deviceId: 'device-original',
    });
    mocks.put.mockReset();
    mocks.enqueueOp.mockReset();
  });

  it('does not let callers replace immutable sync metadata', async () => {
    const result = await patchRecord<Task>('tasks', 'task-1', {
      id: 'task-other',
      title: 'Updated',
      createdAt: '2000-01-01T00:00:00.000Z',
      updatedAt: '2000-01-01T00:00:00.000Z',
      version: 99,
      deviceId: 'device-other',
      deletedAt: '2000-01-01T00:00:00.000Z',
    });

    expect(result).toMatchObject({
      id: 'task-1',
      title: 'Updated',
      createdAt: '2026-07-01T12:00:00.000Z',
      version: 5,
      deviceId: 'device-original',
    });
    expect(result).not.toHaveProperty('deletedAt');
    expect(mocks.put).toHaveBeenCalledWith(result);
    expect(mocks.enqueueOp).toHaveBeenCalledWith(
      expect.objectContaining({ recordId: 'task-1', payload: result }),
    );
  });

  it('does not write or enqueue a patch that changes nothing', async () => {
    const result = await patchRecord<Task>('tasks', 'task-1', {
      title: 'Original',
      version: 99,
    });

    expect(result).toMatchObject({ title: 'Original', version: 4 });
    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.enqueueOp).not.toHaveBeenCalled();
  });

  it('repairs a malformed version when updating a local record', async () => {
    mocks.get.mockResolvedValue({
      id: 'task-1',
      title: 'Original',
      createdAt: '2026-07-01T12:00:00.000Z',
      updatedAt: 'invalid',
      version: Number.NaN,
      deviceId: 'device-original',
    });

    const result = await patchRecord<Task>('tasks', 'task-1', { title: 'Updated' });

    expect(result?.version).toBe(1);
    expect(Number.isFinite(Date.parse(result?.updatedAt ?? ''))).toBe(true);
  });
});

describe('softDeleteRecord', () => {
  it('does not rewrite or re-enqueue an existing tombstone', async () => {
    mocks.put.mockReset();
    mocks.enqueueOp.mockReset();
    mocks.get.mockResolvedValue({
      id: 'task-1',
      deletedAt: '2026-08-01T12:00:00.000Z',
      updatedAt: '2026-08-01T12:00:00.000Z',
      createdAt: '2026-07-01T12:00:00.000Z',
      version: 5,
      deviceId: 'device-original',
    });

    await softDeleteRecord<Task>('tasks', 'task-1');

    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.enqueueOp).not.toHaveBeenCalled();
  });

  it('repairs a malformed version when creating a tombstone', async () => {
    mocks.put.mockReset();
    mocks.enqueueOp.mockReset();
    mocks.get.mockResolvedValue({
      id: 'task-1',
      createdAt: '2026-07-01T12:00:00.000Z',
      updatedAt: 'invalid',
      version: Number.POSITIVE_INFINITY,
      deviceId: 'device-original',
    });

    await softDeleteRecord<Task>('tasks', 'task-1');

    expect(mocks.put).toHaveBeenCalledWith(
      expect.objectContaining({ version: 1, deletedAt: expect.any(String) }),
    );
  });
});
