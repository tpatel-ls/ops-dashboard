'use client';

import { DEFAULT_SETTINGS, getDb } from '@ops-dashboard/core';
import type { Settings } from '@ops-dashboard/core';

function boundedMinutes(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Fill settings added after the first schema and repair invalid timer values. */
export function normalizeSettings(value?: Partial<Settings> | null): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...value,
    id: 'singleton',
    pomodoroFocusMinutes: boundedMinutes(
      value?.pomodoroFocusMinutes,
      DEFAULT_SETTINGS.pomodoroFocusMinutes,
      5,
      90,
    ),
    pomodoroBreakMinutes: boundedMinutes(
      value?.pomodoroBreakMinutes,
      DEFAULT_SETTINGS.pomodoroBreakMinutes,
      1,
      30,
    ),
    updatedAt:
      typeof value?.updatedAt === 'string' && value.updatedAt
        ? value.updatedAt
        : new Date().toISOString(),
  };
}

/** Read settings, seeding the singleton on first access. */
export async function getSettings(): Promise<Settings> {
  const db = getDb();
  const existing = await db.settings.get('singleton');
  const normalized = normalizeSettings(existing);
  if (!existing || JSON.stringify(existing) !== JSON.stringify(normalized)) {
    await db.settings.put(normalized);
  }
  return normalized;
}

/** Patch settings (settings are device-local; not synced). */
export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const db = getDb();
  const current = await getSettings();
  const next = normalizeSettings({ ...current, ...patch, updatedAt: new Date().toISOString() });
  await db.settings.put(next);
  return next;
}

export async function isSyncEnabled(): Promise<boolean> {
  return (await getSettings()).syncEnabled;
}
