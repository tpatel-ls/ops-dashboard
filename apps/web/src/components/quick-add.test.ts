// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const addTask = vi.fn<(text: string, options: unknown) => Promise<void>>();

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: () => ({ projects: [], organizations: [] }),
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
});
