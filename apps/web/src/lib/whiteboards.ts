'use client';

import { bumpVersion, getDb, getDeviceId, newId } from '@ops-dashboard/core';
import type { Whiteboard } from '@ops-dashboard/core';
import { enqueueOp } from './sync-queue';

const MAX_WHITEBOARD_NAME_LENGTH = 200;

function whiteboardName(name: string): string {
  const normalized = name.trim();
  if (!normalized) throw new Error('Whiteboard name is required.');
  if (Array.from(normalized).length > MAX_WHITEBOARD_NAME_LENGTH) {
    throw new Error('Whiteboard name must contain at most 200 characters.');
  }
  return normalized;
}

// `whiteboards.document` is `jsonb not null` in Postgres, and the outbox keeps a
// failed op at the head of its table, so one board pushed with a null document
// held back every later whiteboard write on the device. An empty object is the
// stored form of a blank board; boards saved as null before this are repaired
// on their next rename or delete.
export function storedDocument(document: unknown): unknown {
  return document ?? {};
}

export function availableWhiteboard(board: Whiteboard | undefined): Whiteboard | null {
  return board && !board.deletedAt ? board : null;
}

export async function createWhiteboard(name: string): Promise<Whiteboard> {
  const normalizedName = whiteboardName(name);
  const now = new Date().toISOString();
  const wb: Whiteboard = {
    id: newId(),
    name: normalizedName,
    document: storedDocument(null),
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
    document: storedDocument(document),
  });
  await db.whiteboards.put(next);
  await enqueueOp({ table: 'whiteboards', recordId: id, op: 'put', payload: next });
}

export async function renameWhiteboard(id: string, name: string): Promise<void> {
  const normalizedName = whiteboardName(name);
  const db = getDb();
  const existing = await db.whiteboards.get(id);
  if (!existing || existing.deletedAt) return;
  if (existing.name === normalizedName) return;
  const next = bumpVersion<Whiteboard>({
    ...existing,
    name: normalizedName,
    document: storedDocument(existing.document),
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
    document: storedDocument(existing.document),
    deletedAt: now,
  });
  await db.whiteboards.put(tomb);
  await enqueueOp({ table: 'whiteboards', recordId: id, op: 'delete', payload: tomb });
}
