import { describe, expect, it } from 'vitest';
import { computeFoodTotals } from './food';

describe('computeFoodTotals', () => {
  it('sums calories and macros across items', () => {
    expect(
      computeFoodTotals([
        { name: 'eggs', quantity: '2', calories: 140, protein: 12, carbs: 1, fat: 10 },
        { name: 'toast', calories: 80, protein: 3, carbs: 15, fat: 1 },
      ]),
    ).toEqual({ totalCalories: 220, totalProtein: 15, totalCarbs: 16, totalFat: 11 });
  });

  it('omits macro totals when no item reports them', () => {
    expect(computeFoodTotals([{ name: 'black coffee', calories: 5 }])).toEqual({
      totalCalories: 5,
    });
  });

  it('treats a missing macro as 0 when other items report it', () => {
    expect(
      computeFoodTotals([
        { name: 'chicken', calories: 300, protein: 30 },
        { name: 'rice', calories: 200, carbs: 45 },
      ]),
    ).toEqual({ totalCalories: 500, totalProtein: 30, totalCarbs: 45 });
  });

  it('rounds fractional estimates to whole numbers', () => {
    expect(computeFoodTotals([{ name: 'yogurt', calories: 99.6, protein: 9.4 }])).toEqual({
      totalCalories: 100,
      totalProtein: 9,
    });
  });

  it('returns zero calories for an empty list', () => {
    expect(computeFoodTotals([])).toEqual({ totalCalories: 0 });
  });
});
