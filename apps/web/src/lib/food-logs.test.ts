import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ patchRecord: vi.fn() }));

vi.mock('./records', () => ({
  newRecord: vi.fn(),
  putRecord: vi.fn(),
  patchRecord: mocks.patchRecord,
  softDeleteRecord: vi.fn(),
}));

import {
  compareFoodLogCreation,
  createFoodLog,
  foodEstimate,
  sumFoodLogTotals,
  updateFoodLog,
} from './food-logs';

describe('compareFoodLogCreation', () => {
  it('orders offset timestamps by instant and corrupted timestamps last', () => {
    const logs = [
      { id: 'invalid', createdAt: 'invalid' },
      { id: 'later', createdAt: '2026-08-24T09:30:00-05:00' },
      { id: 'earlier', createdAt: '2026-08-24T14:00:00Z' },
    ];

    expect(logs.sort(compareFoodLogCreation).map((log) => log.id)).toEqual([
      'earlier',
      'later',
      'invalid',
    ]);
  });
});

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
      items: [
        { name: '  Eggs  ', quantity: '  two  ', calories: 140, injected: 'discard' } as never,
      ],
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
    expect(() =>
      updateFoodLog('meal-1', { items: [{ name: 'Eggs', calories: 1_000_001 }] }),
    ).toThrow('Food item calories must be a non-negative number');
  });

  it('bounds the number of items in a meal payload', () => {
    const items = Array.from({ length: 101 }, (_, index) => ({
      name: `Item ${index}`,
      calories: 1,
    }));

    expect(() => updateFoodLog('meal-1', { items })).toThrow(
      'Food items must contain at most 100 entries',
    );
    expect(mocks.patchRecord).not.toHaveBeenCalled();
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

describe('foodEstimate', () => {
  it('keeps a usable stored estimate', () => {
    expect(foodEstimate(0)).toBe(0);
    expect(foodEstimate(540)).toBe(540);
  });

  it('drops values computeFoodTotals would never have stored', () => {
    expect(foodEstimate(undefined)).toBe(0);
    expect(foodEstimate(-10)).toBe(0);
    expect(foodEstimate(Number.NaN)).toBe(0);
    expect(foodEstimate(Number.POSITIVE_INFINITY)).toBe(0);
    expect(foodEstimate('420' as unknown as number)).toBe(0);
  });
});

describe('sumFoodLogTotals', () => {
  it('totals every macro across logs', () => {
    expect(
      sumFoodLogTotals([
        { totalCalories: 500, totalProtein: 30, totalCarbs: 40, totalFat: 20 },
        { totalCalories: 250, totalProtein: 10, totalCarbs: 5, totalFat: 8 },
      ]),
    ).toEqual({ calories: 750, protein: 40, carbs: 45, fat: 28 });
  });

  it('treats a missing macro as no contribution', () => {
    expect(sumFoodLogTotals([{ totalCalories: 200 }])).toEqual({
      calories: 200,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });

  it('keeps one unusable synced row from making the day total NaN', () => {
    const totals = sumFoodLogTotals([
      { totalCalories: 300 },
      { totalCalories: Number.NaN, totalProtein: -4 },
      { totalCalories: 'oops' as unknown as number },
      { totalCalories: 200 },
    ]);
    expect(totals.calories).toBe(500);
    expect(totals.protein).toBe(0);
  });

  it('is all zero for no logs', () => {
    expect(sumFoodLogTotals([])).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });
});
