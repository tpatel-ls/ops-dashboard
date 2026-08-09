'use client';

import { computeFoodTotals, localDay } from '@ops-dashboard/core';
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
  const date = input.date ?? todayISO();
  assertFoodDate(date);

  return putRecord(
    'foodLogs',
    newRecord<FoodLog>({
      date,
      mealType: input.mealType ?? 'snack',
      description,
      items: input.items,
      ...computeFoodTotals(input.items),
      ...(input.source ? { source: input.source } : {}),
    }),
  );
}

export function updateFoodLog(id: string, patch: Partial<FoodLog>) {
  if (patch.date !== undefined) assertFoodDate(patch.date);
  const next = patch.items ? { ...patch, ...computeFoodTotals(patch.items) } : patch;
  return patchRecord<FoodLog>('foodLogs', id, next);
}

function assertFoodDate(date: string): void {
  if (localDay(date) !== date) throw new Error('Food log date must be valid.');
}

export const deleteFoodLog = (id: string) => softDeleteRecord<FoodLog>('foodLogs', id);
