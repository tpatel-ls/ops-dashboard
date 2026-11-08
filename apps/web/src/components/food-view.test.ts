// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const processBrainDump = vi.fn<(raw: string, source: string) => Promise<unknown[]>>();

vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => undefined }));
vi.mock('@/lib/route-items', () => ({ processBrainDump }));
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

const { FoodView } = await import('./food-view');

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  processBrainDump.mockReset();
});

describe('FoodView day', () => {
  it('moves on to the new day at midnight on a page left open', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 5, 23, 59, 30));
    render(createElement(FoodView));
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByText('Thursday, Nov 5')).toBeTruthy();

    await act(async () => vi.advanceTimersByTimeAsync(31_000));

    // Quick log files meals under the current time, so the view has to follow
    // the day or a meal logged after midnight seems to vanish.
    expect(screen.getByText('Friday, Nov 6')).toBeTruthy();
    expect(screen.queryByText('Thursday, Nov 5')).toBeNull();
  });

  it('keeps a day the user picked when midnight passes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 5, 23, 59, 30));
    render(createElement(FoodView));
    await act(async () => vi.advanceTimersByTimeAsync(0));
    fireEvent.click(screen.getByRole('button', { name: 'Previous day' }));
    expect(screen.getByText('Wednesday, Nov 4')).toBeTruthy();

    await act(async () => vi.advanceTimersByTimeAsync(31_000));

    expect(screen.getByText('Wednesday, Nov 4')).toBeTruthy();
  });
});

describe('FoodView quick log', () => {
  it('returns focus to the field after a meal is logged', async () => {
    render(createElement(FoodView));
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Log food' });
    // Browsers blur a focused input when it becomes disabled while the meal is
    // parsed; jsdom does not, so the log stands in for that focus loss.
    processBrainDump.mockImplementation(async () => {
      input.blur();
      return [{ recordType: 'foodLog' }];
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

  it('keeps the entry and says so when nothing could be logged', async () => {
    render(createElement(FoodView));
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Log food' });
    processBrainDump.mockResolvedValue([]);

    fireEvent.change(input, { target: { value: '2 eggs' } });
    await act(async () => {
      fireEvent.submit(input.form!);
    });

    expect(input.value).toBe('2 eggs');
    expect(screen.getByRole('status').textContent).toMatch(/Nothing was logged/);
  });

  it('announces when the meal was saved as a task because the AI is offline', async () => {
    render(createElement(FoodView));
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Log food' });
    processBrainDump.mockResolvedValue([{ aiOffline: true }]);

    fireEvent.change(input, { target: { value: '2 eggs' } });
    await act(async () => {
      fireEvent.submit(input.form!);
    });

    expect(screen.getByRole('status').textContent).toContain('AI offline');
  });
});
