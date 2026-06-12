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
  const settings = await db.settings.get('singleton');
  if (!settings?.syncEnabled) return;
  const row: SyncOp = {
    id: newId(),
    table: args.table,
    recordId: args.recordId,
    op: args.op,
    payload: args.payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  await db.syncOps.put(row);
  // Nudge the sync engine to drain promptly (debounced there). Decoupled via a
  // window event to avoid an import cycle with the engine.
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('ops:sync-kick'));
}

export async function pendingOpCount(): Promise<number> {
  return getDb().syncOps.count();
}
