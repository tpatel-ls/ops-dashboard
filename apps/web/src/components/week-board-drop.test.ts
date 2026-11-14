// @vitest-environment jsdom

import type { DragEndEvent } from '@dnd-kit/core';
import { act, cleanup, render, screen } from '@testing-library/react';
import { format } from 'date-fns';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  onDragEnd: undefined as ((event: DragEndEvent) => void) | undefined,
  rescheduleTask: vi.fn(),
}));
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => undefined }));
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  return {
    ...actual,
    // Capture the board's drop handler so the test can drop without a pointer.
    DndContext: (props: { onDragEnd?: (event: DragEndEvent) => void; children?: ReactNode }) => {
      mocks.onDragEnd = props.onDragEnd;
      return createElement(actual.DndContext, null, props.children);
    },
  };
});
vi.mock('@/lib/tasks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/tasks')>()),
  rescheduleTask: mocks.rescheduleTask,
}));

const { WeekBoard } = await import('./week-board');

afterEach(() => {
  cleanup();
  mocks.rescheduleTask.mockReset();
});

function drop(day: string) {
  mocks.onDragEnd?.({ active: { id: 'task-1' }, over: { id: day } } as unknown as DragEndEvent);
}

describe('WeekBoard drops', () => {
  it('says why a drop the validator refuses did not move the task', async () => {
    mocks.rescheduleTask.mockRejectedValue(
      new Error('Task recurrence end date cannot precede its first occurrence.'),
    );
    render(createElement(WeekBoard));

    await act(async () => drop('2026-09-30'));

    expect(mocks.rescheduleTask).toHaveBeenCalledWith('task-1', '2026-09-30');
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not move that task. Task recurrence end date cannot precede its first occurrence.',
    );
  });

  it('clears the message once a later drop succeeds', async () => {
    mocks.rescheduleTask.mockRejectedValueOnce(new Error('Nope.')).mockResolvedValue(undefined);
    render(createElement(WeekBoard));

    await act(async () => drop('2026-09-30'));
    await screen.findByRole('alert');
    await act(async () => drop('2026-10-01'));

    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('WeekBoard day columns', () => {
  it('heads each day with its full date and spells out the task count', () => {
    render(createElement(WeekBoard));

    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(7);
    // The visible "Mon" over "3" stays out of the name, so it reads once.
    expect(
      screen.getByRole('heading', { level: 2, name: format(new Date(), 'EEEE, MMMM d') }),
    ).toBeTruthy();
    expect(screen.getAllByText('0 tasks')).toHaveLength(7);
  });
});
