// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { msUntilNextLocalDay, useToday } from './use-today';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('msUntilNextLocalDay', () => {
  it('waits until just after the next local midnight', () => {
    const now = new Date(2026, 10, 5, 23, 59, 30);
    expect(msUntilNextLocalDay(now)).toBe(31_000);
  });

  it('never schedules a zero-length wait', () => {
    const justBefore = new Date(new Date(2026, 10, 6).getTime() - 2_000);
    expect(msUntilNextLocalDay(justBefore)).toBe(3_000);
  });
});

describe('useToday', () => {
  it('moves to the next day at local midnight without any other render', () => {
    vi.setSystemTime(new Date(2026, 10, 5, 23, 59, 30));
    const { result } = renderHook(() => useToday());
    expect(result.current).toBe('2026-11-05');

    act(() => vi.advanceTimersByTime(31_000));
    expect(result.current).toBe('2026-11-06');

    act(() => vi.advanceTimersByTime(24 * 60 * 60_000));
    expect(result.current).toBe('2026-11-07');
  });

  it('catches up when the page becomes visible after the device slept', () => {
    vi.setSystemTime(new Date(2026, 10, 5, 22, 0));
    const { result } = renderHook(() => useToday());

    // A suspended device does not run the midnight timer on time.
    vi.setSystemTime(new Date(2026, 10, 6, 7, 0));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current).toBe('2026-11-06');
  });
});
