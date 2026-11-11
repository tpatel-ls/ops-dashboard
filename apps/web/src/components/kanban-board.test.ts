// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ addTask: vi.fn() }));
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: () => ({ tasks: [], projects: [], organizations: [] }),
}));
vi.mock('@/lib/tasks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/tasks')>()),
  addTask: mocks.addTask,
}));

const { KanbanBoard } = await import('./kanban-board');

// Browsers drop focus from a field once it is disabled; jsdom does not, so the
// save blurs it to stand in for that.
function blurWhileSaving() {
  (document.activeElement as HTMLElement | null)?.blur();
}

afterEach(() => {
  cleanup();
  mocks.addTask.mockReset();
});

async function addToFirstLane(text: string) {
  render(createElement(KanbanBoard));
  const field = screen.getAllByPlaceholderText('Add task')[0] as HTMLInputElement;
  field.focus();
  fireEvent.change(field, { target: { value: text } });
  await act(async () => {
    fireEvent.submit(field.closest('form')!);
  });
  return field;
}

describe('KanbanBoard add task', () => {
  it('returns focus to the field with the draft kept when the save fails', async () => {
    mocks.addTask.mockImplementation(async () => {
      blurWhileSaving();
      throw new Error('Task title must contain at most 500 characters.');
    });

    const field = await addToFirstLane('Draft task');

    expect(mocks.addTask).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(document.activeElement).toBe(field));
    expect(field.value).toBe('Draft task');
    expect(field.disabled).toBe(false);
  });

  it('returns focus to the cleared field after a successful add', async () => {
    mocks.addTask.mockImplementation(async () => blurWhileSaving());

    const field = await addToFirstLane('Next task');

    await waitFor(() => expect(document.activeElement).toBe(field));
    expect(field.value).toBe('');
  });
});
