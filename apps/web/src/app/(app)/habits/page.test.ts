// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ShareOutcome } from '@/lib/share';

const shareOrCopy = vi.fn<() => Promise<ShareOutcome>>();
vi.mock('@/lib/share', () => ({ shareOrCopy }));
// Off by default so the share tests never touch the database. A test that
// turns it on gets a hook that re-runs its query when the deps change.
const live = vi.hoisted(() => ({ run: false }));
vi.mock('dexie-react-hooks', async () => {
  const { useEffect, useState } = await import('react');
  return {
    useLiveQuery: (query: () => Promise<unknown>, deps: unknown[] = []) => {
      const [value, setValue] = useState<unknown>();
      useEffect(() => {
        if (live.run) void query().then(setValue, () => undefined);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, deps);
      return value;
    },
  };
});
const loadActivity = vi.fn(async () => []);
vi.mock('@/lib/activity', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/activity')>()),
  loadActivity,
}));
vi.mock('@/components/activity-heatmap', () => ({ ActivityHeatmap: () => null }));

const { default: HabitsPage } = await import('./page');

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  live.run = false;
  loadActivity.mockClear();
  shareOrCopy.mockReset();
});

describe('HabitsPage activity', () => {
  it('reloads the activity window at midnight on a page left open', async () => {
    live.run = true;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 5, 23, 59, 30));
    render(createElement(HabitsPage));
    await act(async () => vi.advanceTimersByTimeAsync(0));
    const callsBefore = loadActivity.mock.calls.length;
    expect(callsBefore).toBeGreaterThan(0);

    await act(async () => vi.advanceTimersByTimeAsync(31_000));

    expect(loadActivity.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});

describe('HabitsPage legend', () => {
  it('leaves the color legend to the heatmap and keeps the scoring key', async () => {
    live.run = true;
    loadActivity.mockResolvedValueOnce([{ date: '2026-11-05', count: 2, level: 2 }] as never);
    render(createElement(HabitsPage));
    await act(async () => {});

    expect(document.body.textContent).toContain('task ×1 · routine ×2');
    expect(screen.queryByLabelText(/^Level \d$/)).toBeNull();
    expect(screen.queryByText('Less')).toBeNull();
  });
});

describe('HabitsPage share score', () => {
  it('confirms when the score was copied instead of shared', async () => {
    shareOrCopy.mockResolvedValue('copied');
    render(createElement(HabitsPage));

    fireEvent.click(screen.getByRole('button', { name: 'Share score' }));

    expect(await screen.findByText('Score copied to the clipboard.')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Score copied to the clipboard.');
  });

  it('reports a share that could neither share nor copy', async () => {
    shareOrCopy.mockResolvedValue('failed');
    render(createElement(HabitsPage));

    fireEvent.click(screen.getByRole('button', { name: 'Share score' }));

    expect(await screen.findByText('Could not share or copy your score.')).toBeTruthy();
  });

  it('stays quiet when the user cancels the share sheet', async () => {
    shareOrCopy.mockResolvedValue('cancelled');
    render(createElement(HabitsPage));

    fireEvent.click(screen.getByRole('button', { name: 'Share score' }));

    await vi.waitFor(() => expect(shareOrCopy).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('status').textContent).toBe('');
  });
});

describe('HabitsPage weekly active days', () => {
  it('labels the rolling count apart from the calendar-week cards', async () => {
    shareOrCopy.mockResolvedValue('shared');
    render(createElement(HabitsPage));

    expect(screen.getByText('of the last 7 days')).toBeTruthy();
    expect(screen.queryByText('days this week')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Share score' }));
    await act(async () => {});
    expect(shareOrCopy).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('Active on 0 of the last 7 days') }),
    );
  });
});
