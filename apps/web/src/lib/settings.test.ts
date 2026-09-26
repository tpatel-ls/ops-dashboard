import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@ops-dashboard/core';
import type { Settings } from '@ops-dashboard/core';

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));

vi.mock('@ops-dashboard/core', async () => {
  const actual = await vi.importActual<typeof import('@ops-dashboard/core')>('@ops-dashboard/core');
  return {
    ...actual,
    getDb: () => ({ settings: { get: mocks.get, put: mocks.put } }),
  };
});

import {
  DEFAULT_VIEWS,
  defaultViewPath,
  getSettings,
  normalizeSettings,
  updateSettings,
} from './settings';

describe('normalizeSettings', () => {
  it('fills settings that were added after an older record was stored', () => {
    const normalized = normalizeSettings({
      id: 'singleton',
      theme: 'dark',
      updatedAt: '2026-07-30T12:00:00.000Z',
    });

    expect(normalized.theme).toBe('dark');
    expect(normalized.aiEnabled).toBe(DEFAULT_SETTINGS.aiEnabled);
    expect(normalized.captureAutoReminder).toBe(DEFAULT_SETTINGS.captureAutoReminder);
    expect(normalized.updatedAt).toBe('2026-07-30T12:00:00.000Z');
  });

  it('repairs timer values that would make focus mode unusable', () => {
    expect(
      normalizeSettings({
        pomodoroFocusMinutes: Number.NaN,
        pomodoroBreakMinutes: 0,
      }),
    ).toMatchObject({
      pomodoroFocusMinutes: DEFAULT_SETTINGS.pomodoroFocusMinutes,
      pomodoroBreakMinutes: 1,
    });

    expect(
      normalizeSettings({
        pomodoroFocusMinutes: 500,
        pomodoroBreakMinutes: 40,
      }),
    ).toMatchObject({
      pomodoroFocusMinutes: 90,
      pomodoroBreakMinutes: 30,
    });
  });

  it('repairs malformed clock settings', () => {
    expect(
      normalizeSettings({
        workdayStart: '8:00',
        workdayEnd: '25:00',
        dailyReviewAt: '17:90',
      }),
    ).toMatchObject({
      workdayStart: DEFAULT_SETTINGS.workdayStart,
      workdayEnd: DEFAULT_SETTINGS.workdayEnd,
      dailyReviewAt: DEFAULT_SETTINGS.dailyReviewAt,
    });

    expect(
      normalizeSettings({ workdayStart: '07:30', workdayEnd: '19:15', dailyReviewAt: '18:45' }),
    ).toMatchObject({ workdayStart: '07:30', workdayEnd: '19:15', dailyReviewAt: '18:45' });
  });

  it('repairs workday ranges that end before they start', () => {
    expect(normalizeSettings({ workdayStart: '18:00', workdayEnd: '09:00' })).toMatchObject({
      workdayStart: DEFAULT_SETTINGS.workdayStart,
      workdayEnd: DEFAULT_SETTINGS.workdayEnd,
    });
    expect(normalizeSettings({ workdayStart: '09:00', workdayEnd: '09:00' })).toMatchObject({
      workdayStart: DEFAULT_SETTINGS.workdayStart,
      workdayEnd: DEFAULT_SETTINGS.workdayEnd,
    });
  });

  it('repairs malformed choices and boolean preferences', () => {
    expect(
      normalizeSettings({
        weekStartsOn: 4 as Settings['weekStartsOn'],
        theme: 'neon' as Settings['theme'],
        defaultView: 'missing' as Settings['defaultView'],
        syncEnabled: 'yes' as unknown as boolean,
        leftyMode: 1 as unknown as boolean,
        aiEnabled: null as unknown as boolean,
        captureAutoReminder: 'false' as unknown as boolean,
        slippingDays: Number.NaN,
      }),
    ).toMatchObject({
      weekStartsOn: DEFAULT_SETTINGS.weekStartsOn,
      theme: DEFAULT_SETTINGS.theme,
      defaultView: DEFAULT_SETTINGS.defaultView,
      syncEnabled: DEFAULT_SETTINGS.syncEnabled,
      leftyMode: DEFAULT_SETTINGS.leftyMode,
      aiEnabled: DEFAULT_SETTINGS.aiEnabled,
      captureAutoReminder: DEFAULT_SETTINGS.captureAutoReminder,
      slippingDays: DEFAULT_SETTINGS.slippingDays,
    });
  });

  it('repairs malformed update timestamps', () => {
    const normalized = normalizeSettings({ updatedAt: 'not-a-timestamp' });

    expect(Number.isFinite(Date.parse(normalized.updatedAt))).toBe(true);
    expect(normalized.updatedAt).not.toBe('not-a-timestamp');
  });

  it('canonicalizes valid update timestamps', () => {
    expect(normalizeSettings({ updatedAt: '2026-08-23T07:00:00-05:00' }).updatedAt).toBe(
      '2026-08-23T12:00:00.000Z',
    );
  });

  it('keeps valid timezones and removes invalid or unknown persisted fields', () => {
    expect(
      normalizeSettings({ timezone: ' America/Chicago ', legacyFlag: true } as never),
    ).toMatchObject({ timezone: 'America/Chicago' });
    expect(normalizeSettings({ timezone: 'america/chicago' } as never)).toMatchObject({
      timezone: 'America/Chicago',
    });
    expect(normalizeSettings({ timezone: 'Not/AZone' })).not.toHaveProperty('timezone');
    expect(normalizeSettings({ legacyFlag: true } as never)).not.toHaveProperty('legacyFlag');
  });
});

describe('defaultViewPath', () => {
  it('renames only the whiteboard view', () => {
    expect(DEFAULT_VIEWS).toHaveLength(15);
    expect(defaultViewPath('today')).toBe('/today');
    expect(defaultViewPath('whiteboard')).toBe('/whiteboards');
    expect(defaultViewPath('people')).toBe('/people');
  });

  // The root route redirects to whichever view is configured, so a view listed
  // here without a matching route folder lands the user on a 404 the moment
  // they open the app. Resolve all fifteen against the routes on disk instead
  // of spot-checking three.
  it('maps every supported default view to a route that exists', () => {
    const missing = DEFAULT_VIEWS.filter(
      (view) => !existsSync(join(__dirname, '../app/(app)', defaultViewPath(view), 'page.tsx')),
    );
    expect(missing).toEqual([]);
  });
});

function storedSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    ...DEFAULT_SETTINGS,
    id: 'singleton',
    updatedAt: '2026-08-01T12:00:00.000Z',
    ...overrides,
  } as Settings;
}

describe('getSettings', () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.put.mockReset();
  });

  it('seeds the singleton when the record is missing', async () => {
    mocks.get.mockResolvedValue(undefined);

    const settings = await getSettings();

    expect(settings).toMatchObject({ id: 'singleton', theme: DEFAULT_SETTINGS.theme });
    expect(mocks.put).toHaveBeenCalledWith(settings);
  });

  it('writes a repaired copy back when the stored record is invalid', async () => {
    // `fromRow` casts synced rows without validating, so a stored record can
    // hold values `normalizeSettings` rejects.
    mocks.get.mockResolvedValue({
      id: 'singleton',
      weekStartsOn: 3,
      pomodoroFocusMinutes: Number.NaN,
      slippingDays: 9_999,
      updatedAt: '2026-08-01T12:00:00.000Z',
    });

    const settings = await getSettings();

    expect(settings.weekStartsOn).toBe(DEFAULT_SETTINGS.weekStartsOn);
    expect(settings.pomodoroFocusMinutes).toBe(DEFAULT_SETTINGS.pomodoroFocusMinutes);
    expect(settings.slippingDays).toBe(365);
    // Persisted, so the next reader does not repeat the repair.
    expect(mocks.put).toHaveBeenCalledWith(settings);
  });

  it('leaves an already-normalized record untouched', async () => {
    mocks.get.mockResolvedValue(storedSettings());

    const settings = await getSettings();

    expect(settings.updatedAt).toBe('2026-08-01T12:00:00.000Z');
    expect(mocks.put).not.toHaveBeenCalled();
  });
});

describe('updateSettings', () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.put.mockReset();
  });

  it('merges the patch over the stored record and stamps updatedAt', async () => {
    mocks.get.mockResolvedValue(storedSettings({ theme: 'light' }));

    const next = await updateSettings({ theme: 'dark' });

    expect(next.theme).toBe('dark');
    // Fields the patch does not mention survive the merge.
    expect(next.weekStartsOn).toBe(DEFAULT_SETTINGS.weekStartsOn);
    expect(next.updatedAt).not.toBe('2026-08-01T12:00:00.000Z');
    expect(mocks.put).toHaveBeenLastCalledWith(next);
  });

  it('normalizes the patch rather than storing an unsupported value', async () => {
    mocks.get.mockResolvedValue(storedSettings());

    const next = await updateSettings({
      theme: 'sepia',
      defaultView: 'nowhere',
      pomodoroBreakMinutes: 0,
    } as unknown as Partial<Settings>);

    expect(next.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(next.defaultView).toBe(DEFAULT_SETTINGS.defaultView);
    // Clamped into the supported 1..30 range instead of stored as 0.
    expect(next.pomodoroBreakMinutes).toBe(1);
  });

  it('rejects a workday range the form could otherwise invert', async () => {
    mocks.get.mockResolvedValue(storedSettings());

    const next = await updateSettings({ workdayStart: '18:00', workdayEnd: '09:00' });

    expect(next.workdayStart).toBe(DEFAULT_SETTINGS.workdayStart);
    expect(next.workdayEnd).toBe(DEFAULT_SETTINGS.workdayEnd);
  });
});
