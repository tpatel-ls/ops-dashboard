// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Project, Task } from '@ops-dashboard/core';

const mocks = vi.hoisted(() => ({
  tables: {} as Record<string, unknown[]>,
}));
// Run the view's own query, so the lane lookup it builds is what is tested.
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
  getDb: () =>
    new Proxy(
      {},
      { get: (_target, table: string) => ({ toArray: async () => mocks.tables[table] ?? [] }) },
    ),
}));

const { useOrgStore } = await import('@/lib/org-store');
const { TasksView } = await import('./tasks-view');

afterEach(() => {
  cleanup();
  act(() => useOrgStore.setState({ ctx: 'all' }));
});

function task(id: string, patch: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    status: 'todo',
    priority: 0,
    tags: [],
    reminders: [],
    checklist: [],
    order: 0,
    createdAt: '2026-11-01T12:00:00.000Z',
    updatedAt: '2026-11-01T12:00:00.000Z',
    version: 1,
    deviceId: 'test',
    ...patch,
  };
}

describe('TasksView org lanes', () => {
  it('keeps a task in its org when the org comes from a finished project', async () => {
    mocks.tables = {
      tasks: [task('Wrap-up task', { projectId: 'p-done' })],
      projects: [
        {
          id: 'p-done',
          name: 'Shipped launch',
          status: 'done',
          orgId: 'org-1',
        } as unknown as Project,
      ],
      domains: [],
      organizations: [{ id: 'org-1', name: 'Acme', color: '#000' }],
    };

    act(() => useOrgStore.setState({ ctx: 'org-1' }));
    render(createElement(TasksView));
    expect(await screen.findByText('Wrap-up task')).toBeTruthy();
    cleanup();

    act(() => useOrgStore.setState({ ctx: 'personal' }));
    render(createElement(TasksView));
    await act(async () => {});
    expect(screen.queryByText('Wrap-up task')).toBeNull();
  });
});
