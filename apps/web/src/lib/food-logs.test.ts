import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ patchRecord: vi.fn() }));

vi.mock('./records', () => ({
  newRecord: vi.fn(),
  putRecord: vi.fn(),
  patchRecord: mocks.patchRecord,
  softDeleteRecord: vi.fn(),
}));

import { createFoodLog, updateFoodLog } from './food-logs';

describe('updateFoodLog', () => {
  beforeEach(() => mocks.patchRecord.mockReset());

  it('recomputes derived totals when meal items change', async () => {
    const items = [
      { name: 'eggs', calories: 140, protein: 12 },
      { name: 'toast', calories: 80, carbs: 15 },
    ];

    await updateFoodLog('meal-1', { items, totalCalories: 999 });

    expect(mocks.patchRecord).toHaveBeenCalledWith('foodLogs', 'meal-1', {
      items,
      totalCalories: 220,
      totalProtein: 12,
      totalCarbs: 15,
    });
  });

  it('rejects impossible calendar dates before persistence', async () => {
    expect(() => updateFoodLog('meal-1', { date: '2026-02-30' })).toThrow(
      'Food log date must be valid',
    );
    expect(mocks.patchRecord).not.toHaveBeenCalled();
    expect(() => createFoodLog({ date: 'not-a-date', description: 'Lunch', items: [] })).toThrow(
      'Food log date must be valid',
    );
  });

  it('normalizes items and rejects malformed nutrition values', async () => {
    await updateFoodLog('meal-1', {
      items: [{ name: '  Eggs  ', quantity: '  two  ', calories: 140 }],
    });
    expect(mocks.patchRecord).toHaveBeenCalledWith(
      'foodLogs',
      'meal-1',
      expect.objectContaining({
        items: [{ name: 'Eggs', quantity: 'two', calories: 140 }],
        totalCalories: 140,
      }),
    );

    expect(() =>
      updateFoodLog('meal-1', { items: [{ name: 'Eggs', calories: Number.NaN }] }),
    ).toThrow('Food item calories must be a non-negative number');
  });

  it('does not accept direct edits to derived totals', async () => {
    await updateFoodLog('meal-1', { totalCalories: 999, description: '  Lunch  ' });

    expect(mocks.patchRecord).toHaveBeenCalledWith('foodLogs', 'meal-1', {
      description: 'Lunch',
    });
  });

  it('rejects attempts to clear required log fields', () => {
    expect(() => updateFoodLog('meal-1', { items: undefined } as never)).toThrow(
      'Food items must be valid',
    );
    expect(() => updateFoodLog('meal-1', { date: undefined } as never)).toThrow(
      'Food log date must be valid',
    );
  });

  it('rejects malformed item collections with a stable validation error', () => {
    expect(() => updateFoodLog('meal-1', { items: {} as never })).toThrow(
      'Food items must be valid',
    );
    expect(() => updateFoodLog('meal-1', { items: [null] as never })).toThrow(
      'Food items must be valid',
    );
    expect(() => updateFoodLog('meal-1', { items: [{ name: 'Eggs' }] as never })).toThrow(
      'Food item calories must be a non-negative number',
    );
    expect(() =>
      updateFoodLog('meal-1', {
        items: [{ name: 'Eggs', quantity: 2, calories: 140 }] as never,
      }),
    ).toThrow('Food items must be valid');
  });
});
