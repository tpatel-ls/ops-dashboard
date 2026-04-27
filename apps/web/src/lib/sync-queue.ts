'use client';

import { getDb, newId } from '@drift/core';
import type { SyncOp } from '@drift/core';

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
}

export async function pendingOpCount(): Promise<number> {
  return getDb().syncOps.count();
}
