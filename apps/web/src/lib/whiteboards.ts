'use client';

import { bumpVersion, getDb, getDeviceId, newId } from '@ops-dashboard/core';
import type { Whiteboard } from '@ops-dashboard/core';
import { enqueueOp } from './sync-queue';

export function availableWhiteboard(board: Whiteboard | undefined): Whiteboard | null {
  return board && !board.deletedAt ? board : null;
}

export async function createWhiteboard(name: string): Promise<Whiteboard> {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error('Whiteboard name is required.');
  const now = new Date().toISOString();
  const wb: Whiteboard = {
    id: newId(),
    name: normalizedName,
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
  if (!existing || existing.deletedAt) return;
  const next = bumpVersion<Whiteboard>({
    ...existing,
    document,
  });
  await db.whiteboards.put(next);
  await enqueueOp({ table: 'whiteboards', recordId: id, op: 'put', payload: next });
}

export async function renameWhiteboard(id: string, name: string): Promise<void> {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error('Whiteboard name is required.');
  const db = getDb();
  const existing = await db.whiteboards.get(id);
  if (!existing || existing.deletedAt) return;
  if (existing.name === normalizedName) return;
  const next = bumpVersion<Whiteboard>({
    ...existing,
    name: normalizedName,
  });
  await db.whiteboards.put(next);
  await enqueueOp({ table: 'whiteboards', recordId: id, op: 'put', payload: next });
}

export async function softDeleteWhiteboard(id: string): Promise<void> {
  const db = getDb();
  const existing = await db.whiteboards.get(id);
  if (!existing || existing.deletedAt) return;
  const now = new Date().toISOString();
  const tomb = bumpVersion<Whiteboard>({
    ...existing,
    deletedAt: now,
  });
  await db.whiteboards.put(tomb);
  await enqueueOp({ table: 'whiteboards', recordId: id, op: 'delete', payload: tomb });
}
