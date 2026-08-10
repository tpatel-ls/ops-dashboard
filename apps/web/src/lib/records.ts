'use client';

import { bumpVersion, getDb, getDeviceId, newId } from '@ops-dashboard/core';
import type { SyncMeta, SyncTable } from '@ops-dashboard/core';
import { enqueueOp } from './sync-queue';

/**
 * Generic local-first CRUD over any syncable Dexie table. Every write also
 * enqueues a sync op and bumps `version` / `updatedAt`, matching the pattern in
 * `tasks.ts`. Boolean-keyed queries must be done with `.filter` (IndexedDB can't
 * index booleans).
 */

export function newRecord<T extends SyncMeta>(fields: Omit<T, keyof SyncMeta>): T {
  const now = new Date().toISOString();
  return {
    ...(fields as Record<string, unknown>),
    id: newId(),
    createdAt: now,
    updatedAt: now,
    version: 1,
    deviceId: getDeviceId(),
  } as T;
}

export async function putRecord<T extends SyncMeta>(table: SyncTable, rec: T): Promise<T> {
  await getDb().table<T>(table).put(rec);
  await enqueueOp({ table, recordId: rec.id, op: 'put', payload: rec });
  return rec;
}

export async function patchRecord<T extends SyncMeta>(
  table: SyncTable,
  id: string,
  patch: Partial<T>,
): Promise<T | null> {
  const t = getDb().table<T>(table);
  const existing = await t.get(id);
  if (!existing || existing.deletedAt) return null;
  const mutablePatch = { ...patch } as Partial<T> & Record<string, unknown>;
  for (const key of ['id', 'createdAt', 'updatedAt', 'version', 'deviceId', 'deletedAt']) {
    delete mutablePatch[key];
  }
  const changed = Object.entries(mutablePatch).some(
    ([key, value]) => !Object.is((existing as T & Record<string, unknown>)[key], value),
  );
  if (!changed) return existing;
  const merged = bumpVersion({
    ...existing,
    ...mutablePatch,
  } as T);
  await t.put(merged);
  await enqueueOp({ table, recordId: id, op: 'put', payload: merged });
  return merged;
}

export async function softDeleteRecord<T extends SyncMeta>(
  table: SyncTable,
  id: string,
): Promise<void> {
  const t = getDb().table<T>(table);
  const existing = await t.get(id);
  if (!existing || existing.deletedAt) return;
  const tomb = bumpVersion({ ...existing, deletedAt: new Date().toISOString() } as T);
  await t.put(tomb);
  await enqueueOp({ table, recordId: id, op: 'delete', payload: tomb });
}

export async function listActive<T extends SyncMeta>(table: SyncTable): Promise<T[]> {
  const all = (await getDb().table<T>(table).toArray()) as T[];
  return all.filter((r) => !r.deletedAt);
}
