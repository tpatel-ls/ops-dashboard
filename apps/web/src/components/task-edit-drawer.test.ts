// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Project, Task } from '@ops-dashboard/core';

const softDeleteTask = vi.fn();
let liveTask: Task | null = null;
let liveProjects: Array<Partial<Project>> = [];
// Run each live query once, against the in-memory rows below.
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
    tasks: { get: async () => liveTask },
    projects: { toArray: async () => liveProjects },
    domains: { toArray: async () => [] },
    content: { filter: () => ({ toArray: async () => [] }) },
  }),
}));
vi.mock('@/lib/use-media-query', () => ({ useMediaQuery: () => false }));
vi.mock('@/lib/tasks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/tasks')>()),
  setChecklist: vi.fn(),
  setTaskStatus: vi.fn(),
  softDeleteTask,
  updateTask: vi.fn(),
}));

const { DeleteTaskButton, TaskEditDrawer } = await import('./task-edit-drawer');
const { useAppStore } = await import('@/lib/app-store');

afterEach(() => {
  cleanup();
  softDeleteTask.mockReset();
  liveTask = null;
  liveProjects = [];
  useAppStore.setState({ editTaskId: null });
});

describe('DeleteTaskButton', () => {
  it('deletes the task and closes the drawer only on a second activation', () => {
    const onDeleted = vi.fn();
    render(createElement(DeleteTaskButton, { id: 'task-1', onDeleted }));

    fireEvent.click(screen.getByRole('button', { name: 'Delete task' }));
    expect(softDeleteTask).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete task. Activate again to confirm' }));
    expect(softDeleteTask).toHaveBeenCalledWith('task-1');
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it('cancels the pending delete when focus leaves the button', () => {
    const onDeleted = vi.fn();
    render(createElement(DeleteTaskButton, { id: 'task-1', onDeleted }));
    const button = screen.getByRole('button', { name: 'Delete task' });

    fireEvent.click(button);
    fireEvent.blur(button);

    expect(button.textContent).toBe('Delete task');
    fireEvent.click(button);
    expect(softDeleteTask).not.toHaveBeenCalled();
  });
});

describe('TaskEditDrawer pickers', () => {
  it('exposes the selected status, priority, and quick date as pressed', async () => {
    liveTask = {
      id: 'task-1',
      title: 'Ship it',
      status: 'blocked',
      priority: 3,
      scheduledFor: undefined,
      tags: [],
      reminders: [],
      checklist: [],
    } as unknown as Task;
    useAppStore.setState({ editTaskId: 'task-1' });
    render(createElement(TaskEditDrawer));
    await screen.findByRole('group', { name: 'Task status' });

    const pressed = (group: string) =>
      Array.from(
        screen.getByRole('group', { name: group }).querySelectorAll('[aria-pressed="true"]'),
      ).map((button) => button.textContent);

    expect(pressed('Task status')).toEqual(['blocked']);
    expect(pressed('Task priority')).toEqual(['Urgent']);
    expect(pressed('Quick schedule task')).toEqual(['Clear date']);
    expect(screen.getByRole('button', { name: 'todo' }).getAttribute('aria-pressed')).toBe('false');
  });
});

describe('TaskEditDrawer links', () => {
  it('keeps showing a project the task still belongs to after it was archived', async () => {
    liveTask = { id: 'task-1', title: 'Ship it', status: 'todo', projectId: 'old' } as Task;
    liveProjects = [
      { id: 'live', name: 'Launch' },
      { id: 'old', name: 'Retired', archivedAt: '2026-10-01T00:00:00.000Z' },
      { id: 'gone', name: 'Other', archivedAt: '2026-10-01T00:00:00.000Z' },
    ];
    useAppStore.setState({ editTaskId: 'task-1' });
    render(createElement(TaskEditDrawer));

    const select = (await screen.findByRole('combobox', { name: 'Project' })) as HTMLSelectElement;
    await vi.waitFor(() => expect(select.options).toHaveLength(3));
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
      'No project',
      'Launch',
      'Retired (archived)',
    ]);
    expect(select.value).toBe('old');
  });
});
