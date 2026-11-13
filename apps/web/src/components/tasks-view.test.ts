// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Domain, Task } from '@ops-dashboard/core';

const mocks = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => mocks.data }));

const { TasksView } = await import('./tasks-view');

afterEach(() => {
  cleanup();
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

function viewData(domains: Domain[]) {
  return {
    allTasks: [task('Health task', { domainId: 'health' }), task('Other task')],
    activeProjects: [],
    activeDomains: domains,
    projectMap: new Map(),
    organizationMap: new Map(),
  };
}

const health = { id: 'health', name: 'Health' } as unknown as Domain;

describe('TasksView domain filter', () => {
  it('stops filtering by a domain once it is deleted elsewhere', () => {
    mocks.data = viewData([health]);
    const { rerender } = render(createElement(TasksView));
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    const picker = screen.getByLabelText('Domain') as HTMLSelectElement;
    fireEvent.change(picker, { target: { value: 'health' } });

    expect(screen.queryByText('Other task')).toBeNull();
    expect(screen.getByRole('button', { name: 'Remove domain filter Health' })).toBeTruthy();

    // The domain is deleted on another device and drops out of the live query.
    mocks.data = viewData([]);
    rerender(createElement(TasksView));

    expect(picker.value).toBe('');
    expect(screen.getByText('Health task')).toBeTruthy();
    expect(screen.getByText('Other task')).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Clear filters' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});

describe('TasksView empty state', () => {
  it('heads the empty list at level 2, directly under the page title', () => {
    mocks.data = { ...viewData([]), allTasks: [] };
    render(createElement(TasksView));

    expect(screen.getByRole('heading', { level: 2, name: 'No open tasks.' })).toBeTruthy();
  });
});
