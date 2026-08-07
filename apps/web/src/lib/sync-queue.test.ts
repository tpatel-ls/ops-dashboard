import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pending: [] as Array<Record<string, unknown>>,
  put: vi.fn(),
  bulkDelete: vi.fn(),
}));

vi.mock('@ops-dashboard/core', () => {
  const syncOps = {
    put: mocks.put,
    bulkDelete: mocks.bulkDelete,
    where: () => ({
      equals: () => ({
        filter: () => ({ sortBy: async () => mocks.pending }),
      }),
    }),
  };
  return {
    getDb: () => ({
      settings: { get: async () => ({ syncEnabled: true }) },
      syncOps,
      transaction: async (_mode: string, _table: unknown, work: () => Promise<void>) => work(),
    }),
    newId: () => 'new-op',
  };
});

import { enqueueOp } from './sync-queue';

describe('enqueueOp', () => {
  beforeEach(() => {
    mocks.pending = [];
    mocks.put.mockReset();
    mocks.bulkDelete.mockReset();
  });

  it('replaces stale pending writes for the same record', async () => {
    mocks.pending = [
      {
        id: 'old-op',
        table: 'tasks',
        recordId: 'task-1',
        op: 'put',
        payload: { title: 'Old' },
        createdAt: '2026-08-07T12:00:00.000Z',
        attempts: 4,
        lastError: 'offline',
      },
      { id: 'duplicate-op' },
    ];

    await enqueueOp({
      table: 'tasks',
      recordId: 'task-1',
      op: 'delete',
      payload: { id: 'task-1', deletedAt: 'now' },
    });

    expect(mocks.put).toHaveBeenCalledWith({
      id: 'old-op',
      table: 'tasks',
      recordId: 'task-1',
      op: 'delete',
      payload: { id: 'task-1', deletedAt: 'now' },
      createdAt: '2026-08-07T12:00:00.000Z',
      attempts: 0,
    });
    expect(mocks.bulkDelete).toHaveBeenCalledWith(['duplicate-op']);
  });
});
