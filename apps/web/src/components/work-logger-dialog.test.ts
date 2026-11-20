// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: () => ({ organizations: [], projects: [] }),
}));
vi.mock('@/lib/use-voice-input', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/use-voice-input')>()),
  useVoiceInput: () => ({
    available: false,
    listening: false,
    transcribing: false,
    error: null,
    toggle: vi.fn(),
  }),
}));
const createOrganization = vi.fn();
vi.mock('@/lib/organizations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/organizations')>()),
  createOrganization,
}));

const addTask = vi.fn();
vi.mock('@/lib/tasks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/tasks')>()),
  addTask,
}));

const { useAppStore } = await import('@/lib/app-store');
const { WorkLoggerDialog } = await import('./work-logger-dialog');

afterEach(() => {
  cleanup();
  createOrganization.mockReset();
  addTask.mockReset();
  useAppStore.setState({ workLoggerOpen: false });
});

describe('WorkLoggerDialog task priority', () => {
  async function addTitle(title: string) {
    fireEvent.change(screen.getByLabelText('Task'), { target: { value: title } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add task' }));
    });
  }

  it('keeps priority marks typed in the title when no priority is picked', async () => {
    addTask.mockResolvedValue({ id: 't1', title: 'Fix bug' });
    useAppStore.getState().openWorkLogger('task');
    render(createElement(WorkLoggerDialog));

    await addTitle('Fix bug !!');

    expect(addTask).toHaveBeenCalledTimes(1);
    expect(addTask.mock.calls[0]![1]).not.toHaveProperty('priority');
  });

  it('sends a priority the user picked', async () => {
    addTask.mockResolvedValue({ id: 't1', title: 'Fix bug' });
    useAppStore.getState().openWorkLogger('task');
    render(createElement(WorkLoggerDialog));
    fireEvent.click(screen.getByRole('button', { name: /Change/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Critical' }));

    await addTitle('Fix bug');

    expect(addTask.mock.calls[0]![1]).toMatchObject({ priority: 3 });
  });
});

describe('WorkLoggerDialog new organization', () => {
  it('creates one organization when Enter is pressed again while the first save runs', async () => {
    let finish!: (org: { id: string; name: string }) => void;
    createOrganization.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    useAppStore.getState().openWorkLogger('project');
    render(createElement(WorkLoggerDialog));

    fireEvent.click(screen.getByRole('button', { name: 'Add org' }));
    const field = screen.getByLabelText('Organization name');
    fireEvent.change(field, { target: { value: 'Acme' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    fireEvent.keyDown(field, { key: 'Enter' });
    await act(async () => finish({ id: 'org-1', name: 'Acme' }));

    expect(createOrganization).toHaveBeenCalledTimes(1);
  });
});

describe('WorkLoggerDialog add org toggle', () => {
  it('reports whether the new organization form is open', () => {
    useAppStore.getState().openWorkLogger('project');
    render(createElement(WorkLoggerDialog));
    const toggle = screen.getByRole('button', { name: 'Add org' });

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByLabelText('Organization name')).toBeNull();

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!);
    expect(panel?.contains(screen.getByLabelText('Organization name'))).toBe(true);

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('WorkLoggerDialog custom minutes', () => {
  it('stays empty when cleared instead of filling in 0', () => {
    useAppStore.getState().openWorkLogger('progress');
    render(createElement(WorkLoggerDialog));
    const field = screen.getByLabelText('Custom minutes') as HTMLInputElement;

    fireEvent.change(field, { target: { value: '' } });
    expect(field.value).toBe('');

    fireEvent.change(field, { target: { value: '45' } });
    expect(field.value).toBe('45');
  });
});
