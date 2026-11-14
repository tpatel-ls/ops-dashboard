// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { StrictMode, createElement, useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type Task } from '@ops-dashboard/core';

type LiveQuery = (query: () => Promise<unknown>, deps?: unknown[]) => unknown;
const liveQuery = vi.hoisted(() => ({ impl: (() => undefined) as LiveQuery }));
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (query: () => Promise<unknown>, deps?: unknown[]) => liveQuery.impl(query, deps),
}));
let tasks: Partial<Task>[] = [];
vi.mock('@ops-dashboard/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ops-dashboard/core')>()),
  getDb: () => ({
    tasks: { toArray: async () => tasks },
    settings: { get: async () => undefined },
  }),
}));

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
  liveQuery.impl = () => undefined;
  tasks = [];
});

/** Runs the real query, again whenever the deps change, like dexie-react-hooks. */
function useDepsAwareLiveQuery(query: () => Promise<unknown>, deps: unknown[] = []) {
  const [value, setValue] = useState<unknown>();
  useEffect(() => {
    let live = true;
    void query().then((next) => {
      if (live) setValue(next);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

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

  it('offers the tasks scheduled for the new day after midnight', async () => {
    liveQuery.impl = useDepsAwareLiveQuery;
    vi.setSystemTime(new Date(2026, 10, 5, 23, 59, 30));
    tasks = [
      {
        id: 't1',
        title: 'Yesterday task',
        status: 'todo',
        priority: 1,
        scheduledFor: '2026-11-05',
      },
      { id: 't2', title: 'Tomorrow task', status: 'todo', priority: 1, scheduledFor: '2026-11-06' },
    ];
    render(createElement(FocusMode));
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByRole('button', { name: /Yesterday task/ })).toBeTruthy();

    await act(async () => vi.advanceTimersByTimeAsync(31_000));

    expect(screen.queryByRole('button', { name: /Yesterday task/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Tomorrow task/ })).toBeTruthy();
  });

  it('groups the task choices under their label', async () => {
    liveQuery.impl = useDepsAwareLiveQuery;
    tasks = [{ id: 't1', title: 'Draft brief', status: 'doing', priority: 1 }];
    render(createElement(FocusMode));
    await act(async () => vi.advanceTimersByTimeAsync(0));

    const group = screen.getByRole('group', { name: 'Choose a focus task' });
    expect(within(group).getByRole('button', { name: /Draft brief/ })).toBeTruthy();
  });
});
