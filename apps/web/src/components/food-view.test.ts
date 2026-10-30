// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const processBrainDump = vi.fn<(raw: string, source: string) => Promise<unknown[]>>();

vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => undefined }));
vi.mock('@/lib/route-items', () => ({ processBrainDump }));
vi.mock('@/lib/use-voice-input', () => ({
  useVoiceInput: () => ({
    available: false,
    listening: false,
    transcribing: false,
    error: null,
    toggle: vi.fn(),
  }),
}));

const { FoodView } = await import('./food-view');

afterEach(() => {
  cleanup();
  processBrainDump.mockReset();
});

describe('FoodView quick log', () => {
  it('returns focus to the field after a meal is logged', async () => {
    render(createElement(FoodView));
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Log food' });
    // Browsers blur a focused input when it becomes disabled while the meal is
    // parsed; jsdom does not, so the log stands in for that focus loss.
    processBrainDump.mockImplementation(async () => {
      input.blur();
      return [];
    });

    input.focus();
    fireEvent.change(input, { target: { value: '2 eggs' } });
    await act(async () => {
      fireEvent.submit(input.form!);
    });

    expect(processBrainDump).toHaveBeenCalledWith('(food log) 2 eggs', 'text');
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
  });

  it('leaves focus alone when the field was not focused at submit', async () => {
    render(createElement(FoodView));
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Log food' });
    processBrainDump.mockResolvedValue([]);

    fireEvent.change(input, { target: { value: '2 eggs' } });
    await act(async () => {
      fireEvent.submit(input.form!);
    });

    expect(processBrainDump).toHaveBeenCalled();
    expect(document.activeElement).not.toBe(input);
  });
});
