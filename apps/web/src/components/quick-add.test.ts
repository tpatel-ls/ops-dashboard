// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const addTask = vi.fn<(text: string, options: unknown) => Promise<void>>();

const live = vi.hoisted(() => ({ projects: [] as unknown[] }));
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: () => ({ projects: live.projects, organizations: [] }),
}));
vi.mock('@/lib/tasks', () => ({ addTask, addTaskToProject: vi.fn() }));
vi.mock('@/lib/haptics', () => ({ hapticSuccess: vi.fn(), hapticTap: vi.fn() }));
const voice = vi.hoisted(() => ({ onTranscript: (() => {}) as (text: string) => void }));
vi.mock('@/lib/use-voice-input', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/use-voice-input')>()),
  useVoiceInput: ({ onTranscript }: { onTranscript: (text: string) => void }) => {
    voice.onTranscript = onTranscript;
    return {
      available: false,
      listening: false,
      transcribing: false,
      error: null,
      toggle: vi.fn(),
    };
  },
}));

const { QuickAdd } = await import('./quick-add');

afterEach(() => {
  cleanup();
  addTask.mockReset();
  live.projects = [];
});

describe('QuickAdd', () => {
  it('adds a voice take to the text already typed instead of replacing it', async () => {
    render(createElement(QuickAdd));
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Quick add task' });

    fireEvent.change(input, { target: { value: 'Call Dana about ' } });
    act(() => voice.onTranscript('the invoice'));
    expect(input.value).toBe('Call Dana about the invoice');

    fireEvent.change(input, { target: { value: '' } });
    act(() => voice.onTranscript('Book flights'));
    expect(input.value).toBe('Book flights');
  });

  it('returns focus to the field after a task is saved', async () => {
    render(createElement(QuickAdd));
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Quick add task' });
    // Browsers blur a focused input when it becomes disabled for the save;
    // jsdom does not, so the save stands in for that focus loss.
    addTask.mockImplementation(async () => {
      input.blur();
    });

    input.focus();
    fireEvent.change(input, { target: { value: 'Ship spec' } });
    await act(async () => {
      fireEvent.submit(input.form!);
    });

    expect(addTask).toHaveBeenCalledWith('Ship spec', expect.anything());
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
  });

  it('leaves focus alone when the field was not focused at submit', async () => {
    render(createElement(QuickAdd));
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Quick add task' });
    addTask.mockResolvedValue();

    fireEvent.change(input, { target: { value: 'Ship spec' } });
    await act(async () => {
      fireEvent.submit(input.form!);
    });

    expect(addTask).toHaveBeenCalled();
    expect(document.activeElement).not.toBe(input);
  });

  describe('project picker', () => {
    const launch = { id: 'p1', name: 'Launch', color: '#f80', status: 'active' };

    function openPicker() {
      live.projects = [launch];
      render(createElement(QuickAdd));
      const trigger = screen.getByRole('button', { name: 'Choose a project' });
      fireEvent.click(trigger);
      expect(screen.getByRole('textbox', { name: 'Filter projects' })).toBeTruthy();
      return trigger;
    }

    it('exposes a named dialog of project buttons instead of an empty listbox', () => {
      const trigger = openPicker();

      expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
      expect(screen.queryByRole('listbox')).toBeNull();
      const dialog = screen.getByRole('dialog', { name: 'Choose project' });
      const group = screen.getByRole('group', { name: 'Projects' });
      expect(dialog.contains(group)).toBe(true);
      expect(group.contains(screen.getByRole('button', { name: 'Launch' }))).toBe(true);
    });

    it('closes on Escape and hands focus back to its button', () => {
      const trigger = openPicker();

      fireEvent.keyDown(screen.getByRole('textbox', { name: 'Filter projects' }), {
        key: 'Escape',
      });

      expect(screen.queryByRole('textbox', { name: 'Filter projects' })).toBeNull();
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(trigger);
    });

    it('closes when focus tabs out of it, but not between its own controls', () => {
      openPicker();
      const filter = screen.getByRole('textbox', { name: 'Filter projects' });
      const launchRow = screen.getByRole('button', { name: 'Launch' });

      fireEvent.blur(filter, { relatedTarget: launchRow });
      expect(screen.getByRole('dialog', { name: 'Choose project' })).toBeTruthy();

      fireEvent.blur(launchRow, {
        relatedTarget: screen.getByRole('textbox', { name: 'Quick add task' }),
      });
      expect(screen.queryByRole('dialog', { name: 'Choose project' })).toBeNull();
    });

    it('moves focus to the task field once a project is chosen', () => {
      openPicker();

      fireEvent.click(screen.getByRole('button', { name: 'Launch' }));

      expect(screen.queryByRole('textbox', { name: 'Filter projects' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Adding to Launch' })).toBeTruthy();
      expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Quick add task' }));
    });
  });
});
