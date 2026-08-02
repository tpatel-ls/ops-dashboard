import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  enqueueOp: vi.fn(),
}));

vi.mock('@ops-dashboard/core', async () => {
  const actual = await vi.importActual<typeof import('@ops-dashboard/core')>('@ops-dashboard/core');
  return {
    ...actual,
    getDb: () => ({ whiteboards: { get: mocks.get, put: mocks.put } }),
    getDeviceId: () => 'device-test',
    newId: () => 'whiteboard-test',
  };
});

vi.mock('./sync-queue', () => ({ enqueueOp: mocks.enqueueOp }));

import { createWhiteboard, renameWhiteboard, softDeleteWhiteboard } from './whiteboards';

describe('whiteboard names', () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.put.mockReset();
    mocks.enqueueOp.mockReset();
  });

  it('trims names when creating a board', async () => {
    const board = await createWhiteboard('  Launch map  ');

    expect(board.name).toBe('Launch map');
    expect(mocks.put).toHaveBeenCalledWith(board);
  });

  it('rejects blank names before creating or renaming', async () => {
    await expect(createWhiteboard('   ')).rejects.toThrow('Whiteboard name is required');
    await expect(renameWhiteboard('whiteboard-test', '   ')).rejects.toThrow(
      'Whiteboard name is required',
    );
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it('does not create another operation for a deleted board', async () => {
    mocks.get.mockResolvedValue({
      id: 'whiteboard-test',
      deletedAt: '2026-08-01T12:00:00.000Z',
    });

    await softDeleteWhiteboard('whiteboard-test');

    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.enqueueOp).not.toHaveBeenCalled();
  });
});
