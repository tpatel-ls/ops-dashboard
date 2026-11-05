// @vitest-environment jsdom

import { act, cleanup, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@ops-dashboard/core';

const useLiveQuery = vi.hoisted(() => vi.fn());
vi.mock('dexie-react-hooks', () => ({ useLiveQuery }));
vi.mock('@/lib/tasks', () => ({ setTaskStatus: vi.fn() }));

const { AgendaSection, WorkDashboard } = await import('./work-dashboard');

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  useLiveQuery.mockReset();
});

function section(shown: number, total: number) {
  const tasks = Array.from(
    { length: shown },
    (_, index) => ({ id: `t${index}`, title: `Task ${index}`, status: 'todo' }) as Task,
  );
  render(
    createElement(AgendaSection, {
      title: 'Overdue',
      description: 'Needs a new date.',
      tasks,
      total,
      projects: [],
      organizations: [],
      today: '2026-11-01',
      showOrganization: false,
      onOpen: vi.fn(),
    }),
  );
  return screen.getByRole('region', { name: 'Overdue' });
}

describe('AgendaSection', () => {
  it('counts every matching task, not just the ones it lists', () => {
    const region = section(8, 12);

    expect(within(region).getByText('12')).toBeTruthy();
    expect(within(region).getByText('And 4 more.')).toBeTruthy();
  });

  it('adds no overflow note when every task is listed', () => {
    const region = section(3, 3);

    expect(within(region).getByText('3')).toBeTruthy();
    expect(within(region).queryByText(/more\.$/)).toBeNull();
  });
});

describe('WorkDashboard', () => {
  it('re-queries for the new day at midnight on a page left open', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 5, 23, 59, 30));
    render(createElement(WorkDashboard));
    expect(useLiveQuery.mock.lastCall?.[1]).toContain('2026-11-05');

    act(() => vi.advanceTimersByTime(31_000));

    expect(useLiveQuery.mock.lastCall?.[1]).toContain('2026-11-06');
  });
});
