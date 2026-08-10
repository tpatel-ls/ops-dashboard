import type { FoodItem } from './types';

export interface FoodTotals {
  totalCalories: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFat?: number;
}

function validEstimate(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function addEstimate(total: number, value: number): number {
  return Math.min(Number.MAX_SAFE_INTEGER, total + value);
}

/**
 * Sum AI-estimated macros across the items of one log. Calories always sum;
 * a macro total is omitted when no item reports that macro (unknown, not 0).
 * Whole numbers: the estimates are rough, decimals would be false precision.
 */
export function computeFoodTotals(items: FoodItem[]): FoodTotals {
  let calories = 0;
  let protein: number | undefined;
  let carbs: number | undefined;
  let fat: number | undefined;
  for (const item of items) {
    calories = addEstimate(calories, validEstimate(item.calories) ?? 0);
    const itemProtein = validEstimate(item.protein);
    const itemCarbs = validEstimate(item.carbs);
    const itemFat = validEstimate(item.fat);
    if (itemProtein !== undefined) protein = addEstimate(protein ?? 0, itemProtein);
    if (itemCarbs !== undefined) carbs = addEstimate(carbs ?? 0, itemCarbs);
    if (itemFat !== undefined) fat = addEstimate(fat ?? 0, itemFat);
  }
  return {
    totalCalories: Math.round(calories),
    ...(protein !== undefined ? { totalProtein: Math.round(protein) } : {}),
    ...(carbs !== undefined ? { totalCarbs: Math.round(carbs) } : {}),
    ...(fat !== undefined ? { totalFat: Math.round(fat) } : {}),
  };
}
