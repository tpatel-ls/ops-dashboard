import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const clearContent = vi.fn();
  const clearSyncOps = vi.fn();
  const syncOps = { clear: clearSyncOps };
  const transaction = vi.fn(async (_mode: string, _tables: unknown[], work: () => Promise<void>) =>
    work(),
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

import { TABLES, wipeLocalData } from './reset';

describe('wipeLocalData', () => {
  it('clears content and queued writes in one transaction', async () => {
    await wipeLocalData();

    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.transaction.mock.calls[0]?.[0]).toBe('rw');
    expect(mocks.clearContent).toHaveBeenCalledTimes(TABLES.length);
    expect(mocks.clearSyncOps).toHaveBeenCalledOnce();
  });

  it('enrols every content table in the transaction', () => {
    const enrolled = (mocks.transaction.mock.calls[0]?.[1] ?? []) as Array<{ name?: string }>;

    // syncOps is passed as the real Dexie table object and has no `name` here.
    expect(enrolled.map((table) => table.name).filter(Boolean)).toEqual(TABLES);
  });

  it('leaves settings out of the content list', () => {
    // The reset deliberately preserves settings. Adding it to the list would
    // wipe the user's preferences along with their data, and the count-based
    // assertion above would still pass.
    expect(TABLES).not.toContain('settings');
    expect(TABLES).not.toContain('syncOps');
  });

  it('lists no table twice', () => {
    expect(new Set(TABLES).size).toBe(TABLES.length);
  });
});
