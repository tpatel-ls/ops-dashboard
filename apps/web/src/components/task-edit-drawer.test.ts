// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const softDeleteTask = vi.fn();
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: vi.fn() }));
vi.mock('@/lib/tasks', () => ({
  availableTask: vi.fn(),
  safeChecklistItems: vi.fn(),
  safeTaskReminders: vi.fn(),
  setChecklist: vi.fn(),
  setTaskStatus: vi.fn(),
  softDeleteTask,
  updateTask: vi.fn(),
}));

const { DeleteTaskButton } = await import('./task-edit-drawer');

afterEach(() => {
  cleanup();
  softDeleteTask.mockReset();
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
