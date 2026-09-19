// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@ops-dashboard/core';

const mocks = vi.hoisted(() => ({ stored: vi.fn() }));

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: () => mocks.stored(),
}));

vi.mock('@ops-dashboard/core', async () => {
  const actual = await vi.importActual<typeof import('@ops-dashboard/core')>('@ops-dashboard/core');
  return { ...actual, getDb: () => ({ settings: { get: vi.fn() } }) };
});

import { useLiveSettings } from './use-settings';

function read() {
  return renderHook(() => useLiveSettings()).result.current;
}

describe('useLiveSettings', () => {
  it('falls back to defaults before the query resolves', () => {
    mocks.stored.mockReturnValue(undefined);
    expect(read().weekStartsOn).toBe(DEFAULT_SETTINGS.weekStartsOn);
    expect(read().pomodoroFocusMinutes).toBe(DEFAULT_SETTINGS.pomodoroFocusMinutes);
  });

  it('keeps stored values that normalizeSettings accepts', () => {
    mocks.stored.mockReturnValue({ id: 'singleton', weekStartsOn: 1, pomodoroFocusMinutes: 45 });
    const settings = read();
    expect(settings.weekStartsOn).toBe(1);
    expect(settings.pomodoroFocusMinutes).toBe(45);
  });

  it('replaces a synced weekStartsOn outside the 0 | 1 union', () => {
    // `?? DEFAULT_SETTINGS.weekStartsOn` let these through, and the call sites
    // then asserted `as 0 | 1` over them.
    for (const weekStartsOn of [3, -1, 'monday', null]) {
      mocks.stored.mockReturnValue({ id: 'singleton', weekStartsOn });
      expect(read().weekStartsOn).toBe(DEFAULT_SETTINGS.weekStartsOn);
    }
  });

  it('keeps the focus timer out of a zero or NaN period', () => {
    // `total` is `pomodoroFocusMinutes * 60`; 0 made the progress ring NaN and
    // NaN rendered the countdown as "NaN:NaN".
    for (const pomodoroFocusMinutes of [0, Number.NaN, -10, 'twenty']) {
      mocks.stored.mockReturnValue({ id: 'singleton', pomodoroFocusMinutes });
      const focusMinutes = read().pomodoroFocusMinutes;
      expect(Number.isFinite(focusMinutes)).toBe(true);
      expect(focusMinutes).toBeGreaterThan(0);
    }
  });

  it('clamps an out-of-range focus period into the settings form bounds', () => {
    mocks.stored.mockReturnValue({ id: 'singleton', pomodoroFocusMinutes: 5000 });
    expect(read().pomodoroFocusMinutes).toBe(90);
  });
});
