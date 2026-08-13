'use client';

import { DEFAULT_SETTINGS, getDb } from '@ops-dashboard/core';
import type { Settings } from '@ops-dashboard/core';

const THEMES: Settings['theme'][] = ['light', 'dark', 'system'];
const DEFAULT_VIEWS: Settings['defaultView'][] = [
  'today',
  'week',
  'month',
  'kanban',
  'whiteboard',
  'calendar',
  'inbox',
  'tasks',
  'routines',
  'habits',
  'projects',
  'content',
  'library',
  'people',
  'domains',
];

function booleanSetting(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function listedSetting<T extends string>(value: unknown, values: T[], fallback: T): T {
  return typeof value === 'string' && values.includes(value as T) ? (value as T) : fallback;
}

function boundedMinutes(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function clockTime(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return fallback;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours <= 23 && minutes <= 59 ? value : fallback;
}

/** Fill settings added after the first schema and repair invalid timer values. */
export function normalizeSettings(value?: Partial<Settings> | null): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...value,
    id: 'singleton',
    weekStartsOn:
      value?.weekStartsOn === 0 || value?.weekStartsOn === 1
        ? value.weekStartsOn
        : DEFAULT_SETTINGS.weekStartsOn,
    theme: listedSetting(value?.theme, THEMES, DEFAULT_SETTINGS.theme),
    syncEnabled: booleanSetting(value?.syncEnabled, DEFAULT_SETTINGS.syncEnabled),
    defaultView: listedSetting(value?.defaultView, DEFAULT_VIEWS, DEFAULT_SETTINGS.defaultView),
    leftyMode: booleanSetting(value?.leftyMode, DEFAULT_SETTINGS.leftyMode),
    workdayStart: clockTime(value?.workdayStart, DEFAULT_SETTINGS.workdayStart),
    workdayEnd: clockTime(value?.workdayEnd, DEFAULT_SETTINGS.workdayEnd),
    dailyReviewAt: clockTime(value?.dailyReviewAt, DEFAULT_SETTINGS.dailyReviewAt),
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
    aiEnabled: booleanSetting(value?.aiEnabled, DEFAULT_SETTINGS.aiEnabled),
    captureAutoReminder: booleanSetting(
      value?.captureAutoReminder,
      DEFAULT_SETTINGS.captureAutoReminder,
    ),
    slippingDays: boundedMinutes(value?.slippingDays, DEFAULT_SETTINGS.slippingDays, 1, 365),
    updatedAt:
      typeof value?.updatedAt === 'string' && Number.isFinite(Date.parse(value.updatedAt))
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
