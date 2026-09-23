/** One parsed item from /api/braindump. Treated as untrusted wire data. */
export interface RoutedItemDraft {
  kind?: string;
  title?: string;
  notes?: string;
  dueText?: string;
  priority?: number;
  tags?: string[];
  projectName?: string;
  routineName?: string;
  food?: {
    mealType?: string;
    items?: Array<{
      name?: string;
      quantity?: string;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
    }>;
  };
}

export type NormalizedRoutedItemDraft = RoutedItemDraft & { title: string };

export const MAX_ROUTED_ITEMS = 100;
export const MAX_ROUTED_TITLE_LENGTH = 500;
const MAX_ROUTED_NOTES_LENGTH = 2_000;
const MAX_ROUTED_DATE_TEXT_LENGTH = 200;
const MAX_ROUTED_NAME_LENGTH = 200;
const MAX_ROUTED_TAGS = 20;
const MAX_ROUTED_TAG_LENGTH = 64;
export const MAX_ROUTED_FOOD_ITEMS = 100;
export const MAX_ROUTED_FOOD_TEXT_LENGTH = 200;
export const MAX_NUTRITION_ESTIMATE = 1_000_000;
const ROUTED_KINDS = new Set([
  'task',
  'note',
  'journal',
  'event',
  'person',
  'quote',
  'routine',
  'food',
  'habit',
]);
const MEAL_TYPES = new Set(['breakfast', 'lunch', 'dinner', 'snack']);

export function boundedDraftText(value: unknown, limit: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = Array.from(value.trim()).slice(0, limit).join('');
  return text || undefined;
}

/**
 * Canonical tag form, so tags that differ only by Unicode composition, width,
 * or locale casing collapse to a single value no matter which capture path
 * produced them.
 *
 * The brain-dump and triage routes both call this. `parseQuickAdd` cannot: it
 * lives in `@ops-dashboard/core`, which does not depend on the web app, so it
 * mirrors this normalization rather than sharing it. The two have to be changed
 * together, or the same tag reaches the tags index as two separate chips.
 */
export function routedTag(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('en-US');
}

function normalizedTags(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (tags.length >= MAX_ROUTED_TAGS) break;
    const bounded = boundedDraftText(raw, MAX_ROUTED_TAG_LENGTH);
    const tag = bounded ? routedTag(bounded) : undefined;
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }
  return tags.length > 0 ? tags : undefined;
}

function nutritionEstimate(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(MAX_NUTRITION_ESTIMATE, Math.max(0, Math.round(value)))
    : undefined;
}

type RoutedFoodItem = NonNullable<NonNullable<RoutedItemDraft['food']>['items']>[number];

/** Read at most MAX_ROUTED_FOOD_ITEMS usable entries, ignoring the rest. */
function boundedFoodItems(value: unknown[]): RoutedFoodItem[] {
  const items: RoutedFoodItem[] = [];
  for (const raw of value) {
    if (items.length >= MAX_ROUTED_FOOD_ITEMS) break;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;
    const name = boundedDraftText(item.name, MAX_ROUTED_FOOD_TEXT_LENGTH);
    if (!name) continue;
    const quantity = boundedDraftText(item.quantity, MAX_ROUTED_FOOD_TEXT_LENGTH);
    const calories = nutritionEstimate(item.calories);
    const protein = nutritionEstimate(item.protein);
    const carbs = nutritionEstimate(item.carbs);
    const fat = nutritionEstimate(item.fat);
    items.push({
      name,
      ...(quantity ? { quantity } : {}),
      ...(calories !== undefined ? { calories } : {}),
      ...(protein !== undefined ? { protein } : {}),
      ...(carbs !== undefined ? { carbs } : {}),
      ...(fat !== undefined ? { fat } : {}),
    });
  }
  return items;
}

function normalizedFood(value: unknown): RoutedItemDraft['food'] | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  const requestedMealType = boundedDraftText(input.mealType, 20)?.toLowerCase();
  const mealType =
    requestedMealType && MEAL_TYPES.has(requestedMealType) ? requestedMealType : undefined;
  const parsed = Array.isArray(input.items) ? boundedFoodItems(input.items) : undefined;
  // Every other optional field here is omitted when it has no content. An empty
  // list carries no meal information, so drop it rather than shipping an
  // `items: []` key the client would have to ignore.
  const items = parsed && parsed.length > 0 ? parsed : undefined;
  return mealType || items
    ? { ...(mealType ? { mealType } : {}), ...(items ? { items } : {}) }
    : undefined;
}

export function normalizeBrainDumpItem(value: unknown): NormalizedRoutedItemDraft | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const title = boundedDraftText(input.title, MAX_ROUTED_TITLE_LENGTH);
  if (!title) return null;
  const requestedKind = boundedDraftText(input.kind, 20)?.toLowerCase();
  const kind = requestedKind && ROUTED_KINDS.has(requestedKind) ? requestedKind : undefined;
  const notes = boundedDraftText(input.notes, MAX_ROUTED_NOTES_LENGTH);
  const dueText = boundedDraftText(input.dueText, MAX_ROUTED_DATE_TEXT_LENGTH);
  const projectName = boundedDraftText(input.projectName, MAX_ROUTED_NAME_LENGTH);
  const routineName = boundedDraftText(input.routineName, MAX_ROUTED_NAME_LENGTH);
  const priority =
    typeof input.priority === 'number' &&
    Number.isInteger(input.priority) &&
    input.priority >= 0 &&
    input.priority <= 3
      ? input.priority
      : undefined;
  const tags = normalizedTags(input.tags);
  const food = normalizedFood(input.food);
  return {
    title,
    ...(kind ? { kind } : {}),
    ...(notes ? { notes } : {}),
    ...(dueText ? { dueText } : {}),
    ...(priority !== undefined ? { priority } : {}),
    ...(tags ? { tags } : {}),
    ...(projectName ? { projectName } : {}),
    ...(routineName ? { routineName } : {}),
    ...(food ? { food } : {}),
  };
}

export function normalizeBrainDumpItems(value: unknown): NormalizedRoutedItemDraft[] {
  if (!Array.isArray(value)) return [];
  const items: NormalizedRoutedItemDraft[] = [];
  for (const raw of value) {
    if (items.length >= MAX_ROUTED_ITEMS) break;
    const item = normalizeBrainDumpItem(raw);
    if (item) items.push(item);
  }
  return items;
}
