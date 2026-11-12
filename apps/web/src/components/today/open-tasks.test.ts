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
  getDb: () => ({
    tasks: { toArray: async () => tasks },
    projects: { toArray: async () => [] },
    domains: { toArray: async () => [] },
  }),
}));
vi.mock('@/lib/tasks', () => ({ setTaskStatus: vi.fn(), updateTask: vi.fn() }));

const { OpenTasks } = await import('./open-tasks');

afterEach(() => {
  cleanup();
  tasks = [];
});

describe('OpenTasks', () => {
  it('names the priority chip by its priority, not its short code', async () => {
    tasks = [
      { id: 't1', title: 'Pay invoice', status: 'todo', priority: 3, tags: [] },
      { id: 't2', title: 'Draft memo', status: 'todo', priority: 0, tags: [] },
    ];
    render(createElement(OpenTasks));

    expect(await screen.findByRole('img', { name: 'Priority 3' })).toBeTruthy();
    expect(screen.queryAllByRole('img', { name: /^Priority/ })).toHaveLength(1);
  });
});
