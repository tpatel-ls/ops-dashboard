// @vitest-environment jsdom

import { DndContext } from '@dnd-kit/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@ops-dashboard/core';
import { useAppStore } from '@/lib/app-store';
import { WeekTaskCard } from './week-board';

const initialStore = useAppStore.getState();

afterEach(() => {
  cleanup();
  useAppStore.setState(initialStore, true);
});

const task = {
  id: 'task-1',
  title: 'Draft launch notes',
  status: 'todo',
  priority: 0,
  tags: [],
  reminders: [],
  checklist: [],
  order: 1,
  scheduledFor: '2026-09-28',
  createdAt: '2026-09-28T12:00:00.000Z',
  updatedAt: '2026-09-28T12:00:00.000Z',
  version: 1,
  deviceId: 'device-1',
} as Task;

function renderCard() {
  const openEdit = vi.fn();
  useAppStore.setState({ openEdit });
  render(
    createElement(
      DndContext,
      null,
      createElement(WeekTaskCard, { task, projectsMap: new Map(), laneColor: 'red' }),
    ),
  );
  return { openEdit, card: screen.getByRole('button', { name: 'Open Draft launch notes' }) };
}

describe('WeekTaskCard', () => {
  it.each(['Enter', ' '])('opens the task editor from the keyboard with %j', (key) => {
    const { openEdit, card } = renderCard();

    fireEvent.keyDown(card, { key });

    expect(openEdit).toHaveBeenCalledWith('task-1');
  });
});
