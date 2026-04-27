'use client';

import { getDb, getDeviceId, newId } from '@drift/core';
import type { Whiteboard } from '@drift/core';
import { enqueueOp } from './sync-queue';

export async function createWhiteboard(name: string): Promise<Whiteboard> {
  const now = new Date().toISOString();
  const wb: Whiteboard = {
    id: newId(),
    name,
    document: null,
    linkedTaskIds: [],
    createdAt: now,
    updatedAt: now,
    version: 1,
    deviceId: getDeviceId(),
  };
  await getDb().whiteboards.put(wb);
  await enqueueOp({ table: 'whiteboards', recordId: wb.id, op: 'put', payload: wb });
  return wb;
}

export async function saveWhiteboard(id: string, document: unknown): Promise<void> {
  const db = getDb();
  const existing = await db.whiteboards.get(id);
  if (!existing) return;
  const next: Whiteboard = {
    ...existing,
    document,
    updatedAt: new Date().toISOString(),
    version: existing.version + 1,
  };
  await db.whiteboards.put(next);
  await enqueueOp({ table: 'whiteboards', recordId: id, op: 'put', payload: next });
}

export async function renameWhiteboard(id: string, name: string): Promise<void> {
  const db = getDb();
  const existing = await db.whiteboards.get(id);
  if (!existing) return;
  const next: Whiteboard = {
    ...existing,
    name,
    updatedAt: new Date().toISOString(),
    version: existing.version + 1,
  };
  await db.whiteboards.put(next);
  await enqueueOp({ table: 'whiteboards', recordId: id, op: 'put', payload: next });
}

export async function softDeleteWhiteboard(id: string): Promise<void> {
  const db = getDb();
  const existing = await db.whiteboards.get(id);
  if (!existing) return;
  const now = new Date().toISOString();
  const tomb: Whiteboard = {
    ...existing,
    deletedAt: now,
    updatedAt: now,
    version: existing.version + 1,
  };
  await db.whiteboards.put(tomb);
  await enqueueOp({ table: 'whiteboards', recordId: id, op: 'delete', payload: tomb });
}
