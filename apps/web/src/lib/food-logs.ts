'use client';

import { computeFoodTotals } from '@ops-dashboard/core';
import type { CaptureSource, FoodItem, FoodLog, MealType } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';
import { todayISO } from './routines';

export { computeFoodTotals };

export interface CreateFoodLogInput {
  /** What the user actually said/typed. */
  description: string;
  items: FoodItem[];
  mealType?: MealType;
  /** Local YYYY-MM-DD; defaults to today. */
  date?: string;
  source?: CaptureSource;
}

/** Create a food log; totals are always derived from the items. */
export function createFoodLog(input: CreateFoodLogInput): Promise<FoodLog> {
  const description = input.description.trim();
  if (!description) throw new Error('Food description is required.');

  return putRecord(
    'foodLogs',
    newRecord<FoodLog>({
      date: input.date ?? todayISO(),
      mealType: input.mealType ?? 'snack',
      description,
      items: input.items,
      ...computeFoodTotals(input.items),
      ...(input.source ? { source: input.source } : {}),
    }),
  );
}

export function updateFoodLog(id: string, patch: Partial<FoodLog>) {
  const next = patch.items ? { ...patch, ...computeFoodTotals(patch.items) } : patch;
  return patchRecord<FoodLog>('foodLogs', id, next);
}

export const deleteFoodLog = (id: string) => softDeleteRecord<FoodLog>('foodLogs', id);
