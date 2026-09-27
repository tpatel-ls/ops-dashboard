import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

describe('content table coverage', () => {
  // TABLES is exhaustive over SyncTable by construction, and wipeLocalData
  // resolves each entry with `db.table(name)`, which throws on a name the Dexie
  // schema never declared. A table added to the union and to this list but not
  // to the schema would therefore break "Clear all data" outright, at runtime,
  // on a path the mocked suite above cannot see. Hold the list against the
  // schema on disk, the way the sync mapping is held against the migrations.
  it('declares every cleared table in the Dexie schema', () => {
    const source = readFileSync(join(__dirname, '../../../../packages/core/src/db.ts'), 'utf8');
    const declared = new Set<string>();
    for (const block of source.matchAll(/\.stores\(\{([\s\S]*?)\}\)/g)) {
      for (const key of block[1]!.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:/gm)) {
        declared.add(key[1]!);
      }
    }

    expect(declared.size).toBeGreaterThan(0);
    expect(TABLES.filter((table) => !declared.has(table))).toEqual([]);
  });
});
