// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Organization, Project } from '@ops-dashboard/core';

let liveOrganizations: Array<Partial<Organization>> = [];
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
    organizations: { toArray: async () => liveOrganizations },
    tasks: { toArray: async () => [] },
    workLogs: { toArray: async () => [] },
  }),
}));
const logWork = vi.fn();
const addTaskToProject = vi.fn();
vi.mock('@/lib/tasks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/tasks')>()),
  addTaskToProject,
}));
vi.mock('@/lib/worklogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/worklogs')>()),
  logWork,
}));

const { LinkedTasksSection, LogWorkSection, MetaSection, MilestonesSection } =
  await import('./project-detail');

afterEach(() => {
  cleanup();
  liveOrganizations = [];
  logWork.mockReset();
  addTaskToProject.mockReset();
});

describe('MetaSection organization picker', () => {
  it('keeps showing an archived organization the project still belongs to', async () => {
    liveOrganizations = [
      { id: 'acme', name: 'Acme', order: 0 },
      { id: 'old', name: 'Old Co', order: 1, archivedAt: '2026-10-01T00:00:00.000Z' },
      { id: 'gone', name: 'Gone Co', order: 2, archivedAt: '2026-10-01T00:00:00.000Z' },
    ];
    const project = { id: 'p-1', name: 'Launch', status: 'active', orgId: 'old' } as Project;
    render(createElement(MetaSection, { project, domains: [] }));

    const select = screen.getByRole('combobox', {
      name: 'Project organization',
    }) as HTMLSelectElement;
    await vi.waitFor(() => expect(select.options).toHaveLength(3));
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
      'Personal',
      'Acme',
      'Old Co (archived)',
    ]);
    expect(select.value).toBe('old');
  });
});

describe('LogWorkSection', () => {
  const project = { id: 'p-1', name: 'Launch', status: 'active' } as Project;

  it('explains the minute limit instead of silently ignoring a longer entry', () => {
    render(createElement(LogWorkSection, { project }));
    fireEvent.change(screen.getByLabelText('Minutes worked'), { target: { value: '1500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log' }));

    expect(screen.getByRole('alert').textContent).toBe('Enter whole minutes between 1 and 1440.');
    expect(logWork).not.toHaveBeenCalled();
  });

  it('reports a rejected save and keeps the entry', async () => {
    logWork.mockRejectedValue(new Error('QuotaExceededError'));
    render(createElement(LogWorkSection, { project }));
    fireEvent.change(screen.getByLabelText('Minutes worked'), { target: { value: '45' } });
    fireEvent.change(screen.getByLabelText('Progress note'), { target: { value: 'Draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not log this work. Your entry is still here.',
    );
    expect(logWork).toHaveBeenCalledWith('p-1', 45, 'Draft');
    expect((screen.getByLabelText('Minutes worked') as HTMLInputElement).value).toBe('45');
    expect((screen.getByLabelText('Progress note') as HTMLInputElement).value).toBe('Draft');
  });
});

describe('LinkedTasksSection', () => {
  const project = { id: 'p-1', name: 'Launch', status: 'active' } as Project;

  it('reports a rejected task and keeps the text', async () => {
    addTaskToProject.mockImplementation(
      (await vi.importActual<typeof import('@/lib/tasks')>('@/lib/tasks')).addTaskToProject,
    );
    render(createElement(LinkedTasksSection, { project }));
    const input = await screen.findByRole<HTMLInputElement>('textbox', {
      name: 'Add task to Launch',
    });
    // The title limit is 500 characters, so addTaskToProject rejects this one.
    const title = 'x'.repeat(501);
    fireEvent.change(input, { target: { value: title } });
    fireEvent.submit(input.form!);

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not add this task. Your text is still here.',
    );
    expect(input.value).toBe(title);
  });

  it('returns focus to the field after a task is added', async () => {
    render(createElement(LinkedTasksSection, { project }));
    const input = await screen.findByRole<HTMLInputElement>('textbox', {
      name: 'Add task to Launch',
    });
    // Browsers blur a focused input when it becomes disabled for the save;
    // jsdom does not, so the save stands in for that focus loss.
    addTaskToProject.mockImplementation(async () => {
      input.blur();
    });

    input.focus();
    fireEvent.change(input, { target: { value: 'Ship spec' } });
    await act(async () => {
      fireEvent.submit(input.form!);
    });

    expect(addTaskToProject).toHaveBeenCalledWith('Ship spec', project);
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
  });

  it('leaves focus alone when the field was not focused at submit', async () => {
    render(createElement(LinkedTasksSection, { project }));
    const input = await screen.findByRole<HTMLInputElement>('textbox', {
      name: 'Add task to Launch',
    });
    addTaskToProject.mockResolvedValue(undefined);

    fireEvent.change(input, { target: { value: 'Ship spec' } });
    await act(async () => {
      fireEvent.submit(input.form!);
    });

    expect(addTaskToProject).toHaveBeenCalled();
    expect(document.activeElement).not.toBe(input);
  });
});

describe('MilestonesSection', () => {
  it('reports a rejected milestone and keeps the draft', async () => {
    const project = {
      id: 'p-1',
      name: 'Launch',
      status: 'active',
      milestones: [],
    } as unknown as Project;
    render(createElement(MilestonesSection, { project }));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    // Milestone titles are limited to 500 characters, so updateProject rejects this one.
    const title = 'x'.repeat(501);
    fireEvent.change(screen.getByLabelText('Milestone title'), { target: { value: title } });
    fireEvent.keyDown(screen.getByLabelText('Milestone title'), { key: 'Enter' });

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not add this milestone. Your draft is still here.',
    );
    expect((screen.getByLabelText('Milestone title') as HTMLInputElement).value).toBe(title);
  });
});
