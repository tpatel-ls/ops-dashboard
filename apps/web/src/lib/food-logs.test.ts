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
});
