import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@ops-dashboard/core';
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
});
