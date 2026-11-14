// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@ops-dashboard/core';

let tasks: Partial<Task>[] = [];

vi.mock('dexie-react-hooks', async () => {
  const { useEffect, useState } = await import('react');
  return {
    useLiveQuery: (query: () => Promise<unknown>, deps: unknown[] = []) => {
      const [value, setValue] = useState<unknown>();
      useEffect(() => {
        void query().then(setValue);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, deps);
      return value;
    },
  };
});
vi.mock('@ops-dashboard/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ops-dashboard/core')>()),
  getDb: () => ({
    tasks: {
      toArray: async () => tasks,
      get: async (id: string) => tasks.find((task) => task.id === id),
    },
  }),
}));
const updateTask = vi.fn(async () => undefined);
vi.mock('@/lib/tasks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/tasks')>()),
  updateTask,
}));

const { useAppStore } = await import('@/lib/app-store');
const { DailyReviewDialog } = await import('./daily-review');

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  updateTask.mockClear();
  tasks = [];
  useAppStore.setState({ reviewOpen: false });
});

describe('DailyReviewDialog', () => {
  it('rolls slipped tasks to the day after the reviewed day when confirmed after midnight', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 5, 23, 59, 30));
    tasks = [{ id: 't1', title: 'Send invoice', status: 'todo', scheduledFor: '2026-11-05' }];
    useAppStore.setState({ reviewOpen: true });

    render(createElement(DailyReviewDialog));
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Thursday, November 5');
    expect(screen.getByRole('heading', { level: 3, name: 'Roll to tomorrow?' })).toBeTruthy();
    expect(screen.getByText('Send invoice')).toBeTruthy();

    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    await act(async () => {
      screen.getByRole('button', { name: 'Roll all forward' }).click();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(updateTask).toHaveBeenCalledTimes(1);
    expect(updateTask).toHaveBeenCalledWith('t1', { scheduledFor: '2026-11-06' });
  });

  it('rolls the other tasks and names the one whose recurrence ends today', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 5, 18, 0));
    tasks = [
      {
        id: 't1',
        title: 'Weekly sync',
        status: 'todo',
        scheduledFor: '2026-11-05',
        recurrence: { freq: 'weekly', interval: 1, endsOn: '2026-11-05' },
      },
      { id: 't2', title: 'Send invoice', status: 'todo', scheduledFor: '2026-11-05' },
    ];
    const actual = await vi.importActual<typeof import('@/lib/tasks')>('@/lib/tasks');
    updateTask.mockImplementationOnce(((id: string, patch: Partial<Task>) =>
      actual.updateTask(id, patch)) as never);
    useAppStore.setState({ reviewOpen: true });

    render(createElement(DailyReviewDialog));
    await act(async () => vi.advanceTimersByTimeAsync(0));
    await act(async () => {
      screen.getByRole('button', { name: 'Roll all forward' }).click();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(updateTask).toHaveBeenCalledWith('t2', { scheduledFor: '2026-11-06' });
    expect(screen.getByRole('alert').textContent).toBe(
      'Could not roll "Weekly sync" forward. Task recurrence end date cannot precede its first occurrence.',
    );
  });
});
