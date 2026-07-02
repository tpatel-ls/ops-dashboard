import type { FoodItem } from './types';

export interface FoodTotals {
  totalCalories: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFat?: number;
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
    calories += item.calories || 0;
    if (item.protein !== undefined) protein = (protein ?? 0) + item.protein;
    if (item.carbs !== undefined) carbs = (carbs ?? 0) + item.carbs;
    if (item.fat !== undefined) fat = (fat ?? 0) + item.fat;
  }
  return {
    totalCalories: Math.round(calories),
    ...(protein !== undefined ? { totalProtein: Math.round(protein) } : {}),
    ...(carbs !== undefined ? { totalCarbs: Math.round(carbs) } : {}),
    ...(fat !== undefined ? { totalFat: Math.round(fat) } : {}),
  };
}
