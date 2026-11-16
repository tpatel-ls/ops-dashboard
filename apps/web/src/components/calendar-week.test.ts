// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { isoDay } from '@ops-dashboard/core';
import type { Task } from '@ops-dashboard/core';
import { addDays } from 'date-fns';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const today = isoDay(new Date());
const farAway = isoDay(addDays(new Date(), 60));

function task(overrides: Partial<Task>): Task {
  return {
    id: overrides.title ?? 'task',
    title: 'Task',
    status: 'todo',
    priority: 'medium',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Task;
}

const tasks: Task[] = [
  task({ title: 'Plan offsite', scheduledFor: today }),
  task({ title: 'File taxes', dueAt: today }),
  task({ title: 'Next quarter', scheduledFor: farAway }),
];

vi.mock('dexie-react-hooks', async () => {
  const { useEffect, useState } = await import('react');
  return {
    useLiveQuery: (query: () => Promise<unknown>) => {
      const [pending] = useState(query);
      const [value, setValue] = useState<unknown>();
      useEffect(() => {
        void pending.then(setValue);
      }, [pending]);
      return value;
    },
  };
});
vi.mock('@ops-dashboard/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ops-dashboard/core')>()),
  getDb: () => ({
    tasks: { toArray: async () => tasks },
    projects: { toArray: async () => [] },
    organizations: { toArray: async () => [] },
    settings: { get: async () => undefined },
  }),
}));

const { CalendarWeek } = await import('./calendar-week');

afterEach(cleanup);

describe('CalendarWeek desktop grid', () => {
  // The grid only had hour rows, so a task scheduled or due on a day with no
  // time block showed in the mobile agenda but nowhere on desktop.
  it('lists untimed scheduled and due tasks in an all-day row', async () => {
    render(createElement(CalendarWeek));

    expect(await screen.findByText('All day')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Plan offsite Scheduled' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'File taxes Due' })).toBeTruthy();
    // Outside the shown week: neither the agenda nor the grid lists it.
    expect(screen.queryByText('Next quarter')).toBeNull();
  });
});
