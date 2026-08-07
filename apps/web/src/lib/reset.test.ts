import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const clearContent = vi.fn();
  const clearSyncOps = vi.fn();
  const syncOps = { clear: clearSyncOps };
  const transaction = vi.fn(
    async (_mode: string, _tables: unknown[], work: () => Promise<void>) => work(),
  );
  return { clearContent, clearSyncOps, syncOps, transaction };
});

vi.mock('@ops-dashboard/core', () => ({
  getDb: () => ({
    table: (name: string) => ({ name, clear: mocks.clearContent }),
    syncOps: mocks.syncOps,
    transaction: mocks.transaction,
  }),
}));

import { wipeLocalData } from './reset';

describe('wipeLocalData', () => {
  it('clears content and queued writes in one transaction', async () => {
    await wipeLocalData();

    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.transaction.mock.calls[0]?.[0]).toBe('rw');
    expect(mocks.clearContent).toHaveBeenCalledTimes(19);
    expect(mocks.clearSyncOps).toHaveBeenCalledOnce();
  });
});
