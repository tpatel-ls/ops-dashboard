'use client';

import { computeFoodTotals, localDay } from '@ops-dashboard/core';
import type { CaptureSource, FoodItem, FoodLog, MealType } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';
import { todayISO } from './routines';

export { computeFoodTotals };

const MEAL_TYPES = new Set<MealType>(['breakfast', 'lunch', 'dinner', 'snack']);
const CAPTURE_SOURCES = new Set<CaptureSource>(['text', 'voice', 'watch', 'journal', 'notepad']);

function normalizeFoodItems(items: unknown): FoodItem[] {
  if (!Array.isArray(items)) throw new Error('Food items must be valid.');
  return items.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Food items must be valid.');
    const candidate = item as Partial<FoodItem>;
    if (typeof candidate.name !== 'string') throw new Error('Food items must be valid.');
    if (candidate.quantity !== undefined && typeof candidate.quantity !== 'string') {
      throw new Error('Food items must be valid.');
    }
    const name = candidate.name.trim();
    if (!name) throw new Error('Food item name is required.');
    if (!Number.isFinite(candidate.calories) || (candidate.calories ?? -1) < 0) {
      throw new Error('Food item calories must be a non-negative number.');
    }
    for (const [label, value] of [
      ['protein', candidate.protein],
      ['carbs', candidate.carbs],
      ['fat', candidate.fat],
    ] as const) {
      if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
        throw new Error(`Food item ${label} must be a non-negative number.`);
      }
    }
    const quantity = candidate.quantity?.trim();
    const normalized = { ...candidate, name } as FoodItem;
    if (quantity) normalized.quantity = quantity;
    else delete normalized.quantity;
    return normalized;
  });
}

function normalizeFoodPatch(patch: Partial<FoodLog>): Partial<FoodLog> {
  const normalized = { ...patch };
  if (Object.hasOwn(normalized, 'description')) {
    if (typeof normalized.description !== 'string') {
      throw new Error('Food description is required.');
    }
    normalized.description = normalized.description.trim();
    if (!normalized.description) throw new Error('Food description is required.');
  }
  if (Object.hasOwn(normalized, 'date')) {
    if (typeof normalized.date !== 'string') throw new Error('Food log date must be valid.');
    assertFoodDate(normalized.date);
  }
  if (Object.hasOwn(normalized, 'mealType') && !MEAL_TYPES.has(normalized.mealType!)) {
    throw new Error('Meal type must be valid.');
  }
  if (normalized.source !== undefined && !CAPTURE_SOURCES.has(normalized.source)) {
    throw new Error('Food log source must be valid.');
  }
  for (const key of ['totalCalories', 'totalProtein', 'totalCarbs', 'totalFat'] as const) {
    delete normalized[key];
  }
  if (Object.hasOwn(normalized, 'items')) {
    if (!normalized.items) throw new Error('Food items must be valid.');
    normalized.items = normalizeFoodItems(normalized.items);
    Object.assign(normalized, computeFoodTotals(normalized.items));
  }
  return normalized;
}

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
  const fields = normalizeFoodPatch({
    description: input.description,
    items: input.items,
    mealType: input.mealType ?? 'snack',
    date: input.date ?? todayISO(),
    source: input.source,
  });

  return putRecord(
    'foodLogs',
    newRecord<FoodLog>({
      date: fields.date!,
      mealType: fields.mealType!,
      description: fields.description!,
      items: fields.items!,
      ...computeFoodTotals(fields.items!),
      ...(fields.source ? { source: fields.source } : {}),
    }),
  );
}

export function updateFoodLog(id: string, patch: Partial<FoodLog>) {
  return patchRecord<FoodLog>('foodLogs', id, normalizeFoodPatch(patch));
}

function assertFoodDate(date: string): void {
  if (localDay(date) !== date) throw new Error('Food log date must be valid.');
}

export const deleteFoodLog = (id: string) => softDeleteRecord<FoodLog>('foodLogs', id);
