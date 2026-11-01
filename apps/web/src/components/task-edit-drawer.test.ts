// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@ops-dashboard/core';

const softDeleteTask = vi.fn();
let liveTask: Task | null = null;
// The drawer's own query passes deps ([id]); the project, domain, and content
// pickers do not.
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (_query: unknown, deps?: unknown[]) => (deps ? liveTask : []),
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
  it('exposes the selected status, priority, and quick date as pressed', () => {
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
