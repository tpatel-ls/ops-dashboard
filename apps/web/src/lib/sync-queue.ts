'use client';

import { getDb, newId } from '@ops-dashboard/core';
import type { SyncOp } from '@ops-dashboard/core';

interface EnqueueArgs {
  table: SyncOp['table'];
  recordId: string;
  op: SyncOp['op'];
  payload: unknown;
}

export async function enqueueOp(args: EnqueueArgs): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.syncOps, async () => {
    const pending = await db.syncOps
      .where('recordId')
      .equals(args.recordId)
      .filter((candidate) => candidate.table === args.table)
      .sortBy('createdAt');
    const [existing, ...duplicates] = pending;
    if (existing) {
      const row: SyncOp = {
        ...existing,
        op: args.op,
        payload: args.payload,
        attempts: 0,
      };
      delete row.lastError;
      await db.syncOps.put(row);
      if (duplicates.length > 0) await db.syncOps.bulkDelete(duplicates.map((item) => item.id));
      return;
    }
    await db.syncOps.put({
      id: newId(),
      table: args.table,
      recordId: args.recordId,
      op: args.op,
      payload: args.payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
    });
  });
  // Nudge the sync engine to drain promptly (debounced there). Decoupled via a
  // window event to avoid an import cycle with the engine.
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('ops:sync-kick'));
}

export async function pendingOpCount(): Promise<number> {
  return getDb().syncOps.count();
}
