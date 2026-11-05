// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@ops-dashboard/core';

vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => undefined }));

const { FocusMode } = await import('./focus-mode');
const { useAppStore } = await import('@/lib/app-store');

const FOCUS_MS = DEFAULT_SETTINGS.pomodoroFocusMinutes * 60_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-05T09:00:00Z'));
  useAppStore.setState({ focusOpen: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  useAppStore.setState({ focusOpen: false });
});

function timerText() {
  return screen.getByRole('timer').textContent;
}

describe('FocusMode countdown', () => {
  it('catches up to the wall clock when the browser throttled the interval', () => {
    render(createElement(FocusMode));
    fireEvent.click(screen.getByRole('button', { name: /Start/ }));

    // A hidden tab can deliver one tick after minutes have passed. The tick
    // itself advances the fake clock by the final second.
    vi.setSystemTime(Date.now() + 10 * 60_000 - 1000);
    act(() => vi.advanceTimersByTime(1000));

    const remaining = DEFAULT_SETTINGS.pomodoroFocusMinutes - 10;
    expect(timerText()).toBe(`${String(remaining).padStart(2, '0')}:00`);
  });

  it('moves to the break exactly once when a focus session ends under Strict Mode', async () => {
    render(createElement(StrictMode, null, createElement(FocusMode)));
    fireEvent.click(screen.getByRole('button', { name: /Start/ }));

    await act(async () => vi.advanceTimersByTime(FOCUS_MS));

    expect(screen.getByText(/Break session/)).toBeTruthy();
    expect(timerText()).toBe(
      `${String(DEFAULT_SETTINGS.pomodoroBreakMinutes).padStart(2, '0')}:00`,
    );
  });
});
