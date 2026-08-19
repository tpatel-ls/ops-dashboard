import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@ops-dashboard/core';
import type { Settings } from '@ops-dashboard/core';
import { normalizeSettings } from './settings';

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

  it('keeps valid timezones and removes invalid or unknown persisted fields', () => {
    expect(
      normalizeSettings({ timezone: ' America/Chicago ', legacyFlag: true } as never),
    ).toMatchObject({ timezone: 'America/Chicago' });
    expect(normalizeSettings({ timezone: 'Not/AZone' })).not.toHaveProperty('timezone');
    expect(normalizeSettings({ legacyFlag: true } as never)).not.toHaveProperty('legacyFlag');
  });
});
