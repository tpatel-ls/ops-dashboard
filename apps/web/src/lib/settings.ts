'use client';

import { DEFAULT_SETTINGS, getDb } from '@drift/core';
import type { Settings } from '@drift/core';

/** Read settings, seeding the singleton on first access. */
export async function getSettings(): Promise<Settings> {
  const db = getDb();
  const existing = await db.settings.get('singleton');
  if (existing) return existing;
  const seeded: Settings = { ...DEFAULT_SETTINGS, updatedAt: new Date().toISOString() };
  await db.settings.put(seeded);
  return seeded;
}

/** Patch settings (settings are device-local; not synced). */
export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const db = getDb();
  const current = await getSettings();
  const next: Settings = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await db.settings.put(next);
  return next;
}

export async function isSyncEnabled(): Promise<boolean> {
  return (await getSettings()).syncEnabled;
}
