// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FoodLog } from '@ops-dashboard/core';

const processBrainDump = vi.fn<(raw: string, source: string) => Promise<unknown[]>>();
const deleteFoodLog = vi.fn(async () => {});

vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => undefined }));
vi.mock('@/lib/route-items', () => ({ processBrainDump }));
vi.mock('@/lib/food-logs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/food-logs')>()),
  deleteFoodLog,
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

const { FoodLogRow, FoodView } = await import('./food-view');

const foodLog = {
  id: 'log-1',
  date: '2026-11-26',
  mealType: 'breakfast',
  description: 'Two eggs',
  items: [],
  totalCalories: 140,
  createdAt: '2026-11-26T08:00:00.000Z',
  updatedAt: '2026-11-26T08:00:00.000Z',
  version: 1,
  deviceId: 'device-1',
} as FoodLog;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  processBrainDump.mockReset();
  deleteFoodLog.mockClear();
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

  it('names the year once the user pages back into last year', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 9, 0));
    render(createElement(FoodView));
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByText('Thursday, Jan 1')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Previous day' }));

    expect(screen.getByText('Wednesday, Dec 31, 2025')).toBeTruthy();
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

describe('FoodLogRow', () => {
  it('deletes the entry only on a second activation', () => {
    render(createElement('ul', null, createElement(FoodLogRow, { log: foodLog })));

    fireEvent.click(screen.getByRole('button', { name: 'Delete Two eggs' }));
    expect(deleteFoodLog).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: 'Delete Two eggs. Activate again to confirm' }),
    );
    expect(deleteFoodLog).toHaveBeenCalledWith('log-1');
  });

  it('cancels the pending delete when focus leaves the button', () => {
    render(createElement('ul', null, createElement(FoodLogRow, { log: foodLog })));
    const button = screen.getByRole('button', { name: 'Delete Two eggs' });

    fireEvent.click(button);
    fireEvent.blur(button);
    fireEvent.click(button);

    expect(deleteFoodLog).not.toHaveBeenCalled();
  });

  it('names its meal type select after the entry it moves', () => {
    render(createElement('ul', null, createElement(FoodLogRow, { log: foodLog })));

    const select = screen.getByRole('combobox', { name: 'Meal type: Two eggs' });
    expect((select as HTMLSelectElement).value).toBe('breakfast');
  });
});
