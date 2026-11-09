// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@ops-dashboard/core';

let tasks: Partial<Task>[] = [];

vi.mock('dexie-react-hooks', async () => {
  const { useEffect, useState } = await import('react');
  return {
    useLiveQuery: (query: () => Promise<unknown>) => {
      const [value, setValue] = useState<unknown>();
      useEffect(() => {
        void query().then(setValue);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return value;
    },
  };
});
vi.mock('@ops-dashboard/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ops-dashboard/core')>()),
  getDb: () => ({ tasks: { toArray: async () => tasks } }),
}));
vi.mock('@/lib/tasks', () => ({ setTaskStatus: vi.fn(), updateTask: vi.fn() }));

const { TopThree } = await import('./top-three');

afterEach(() => {
  cleanup();
  tasks = [];
});

describe('TopThree', () => {
  it('names each starred task priority that the bar shows only as color', async () => {
    tasks = [
      { id: 't1', title: 'Pay invoice', status: 'todo', starred: true, priority: 3 },
      { id: 't2', title: 'Draft memo', status: 'todo', starred: true, priority: 1 },
      { id: 't3', title: 'Tidy desk', status: 'todo', starred: true, priority: 0 },
    ];

    render(createElement(TopThree));
    await screen.findByText('Pay invoice');

    expect(screen.getAllByRole('img').map((bar) => bar.getAttribute('aria-label'))).toEqual([
      'Priority 3',
      'Priority 1',
    ]);
  });
});
