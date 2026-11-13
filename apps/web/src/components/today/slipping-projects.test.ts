// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '@ops-dashboard/core';

let projects: Partial<Project>[] = [];

vi.mock('dexie-react-hooks', async () => {
  const { useEffect, useState } = await import('react');
  return {
    // Re-runs the query when the deps change, like the real hook.
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
  getDb: () => ({ projects: { toArray: async () => projects } }),
}));
vi.mock('@/lib/use-settings', () => ({ useLiveSettings: () => ({ slippingDays: 14 }) }));

const { SlippingProjects } = await import('./slipping-projects');

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  projects = [];
});

describe('SlippingProjects', () => {
  it('flags a project that went quiet overnight on a page left open', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 5, 23, 59, 30));
    projects = [
      {
        id: 'p1',
        name: 'Atlas',
        kind: 'project',
        status: 'active',
        // 14 days ago at midnight: not past the 14-day threshold until the
        // next day starts.
        lastWorkedAt: new Date(2026, 9, 22).toISOString(),
      },
    ];

    render(createElement(SlippingProjects));
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(screen.queryByText('Atlas')).toBeNull();

    await act(async () => vi.advanceTimersByTimeAsync(31_000));

    expect(screen.getByText('Atlas')).toBeTruthy();
  });

  it('flags a quiet synced project whose kind is missing or unknown, but not an area', async () => {
    const quiet = { status: 'active' as const, lastWorkedAt: new Date(2020, 0, 1).toISOString() };
    projects = [
      { id: 'p1', name: 'No kind', ...quiet },
      { id: 'p2', name: 'Future kind', kind: 'client' as Project['kind'], ...quiet },
      { id: 'p3', name: 'Ongoing area', kind: 'area', ...quiet },
    ];

    render(createElement(SlippingProjects));

    expect(await screen.findByText('No kind')).toBeTruthy();
    expect(screen.getByText('Future kind')).toBeTruthy();
    expect(screen.queryByText('Ongoing area')).toBeNull();
  });

  it('titles the list with a level-2 heading', async () => {
    projects = [
      {
        id: 'p1',
        name: 'Atlas',
        kind: 'project',
        status: 'active',
        lastWorkedAt: new Date(2020, 0, 1).toISOString(),
      },
    ];

    render(createElement(SlippingProjects));

    expect(await screen.findByRole('heading', { level: 2, name: 'Needs attention' })).toBeTruthy();
  });
});
