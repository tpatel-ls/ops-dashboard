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
const MAX_ROUTED_FOOD_ITEMS = 100;
const MAX_ROUTED_FOOD_TEXT_LENGTH = 200;
const MAX_NUTRITION_ESTIMATE = 1_000_000;
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

function normalizedTags(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (tags.length >= MAX_ROUTED_TAGS) break;
    const tag = boundedDraftText(raw, MAX_ROUTED_TAG_LENGTH)?.toLowerCase();
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

function normalizedFood(value: unknown): RoutedItemDraft['food'] | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  const requestedMealType = boundedDraftText(input.mealType, 20)?.toLowerCase();
  const mealType =
    requestedMealType && MEAL_TYPES.has(requestedMealType) ? requestedMealType : undefined;
  const items = Array.isArray(input.items)
    ? input.items
        .flatMap((raw) => {
          if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
          const item = raw as Record<string, unknown>;
          const name = boundedDraftText(item.name, MAX_ROUTED_FOOD_TEXT_LENGTH);
          if (!name) return [];
          const quantity = boundedDraftText(item.quantity, MAX_ROUTED_FOOD_TEXT_LENGTH);
          const calories = nutritionEstimate(item.calories);
          const protein = nutritionEstimate(item.protein);
          const carbs = nutritionEstimate(item.carbs);
          const fat = nutritionEstimate(item.fat);
          return [
            {
              name,
              ...(quantity ? { quantity } : {}),
              ...(calories !== undefined ? { calories } : {}),
              ...(protein !== undefined ? { protein } : {}),
              ...(carbs !== undefined ? { carbs } : {}),
              ...(fat !== undefined ? { fat } : {}),
            },
          ];
        })
        .slice(0, MAX_ROUTED_FOOD_ITEMS)
    : undefined;
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
  return value
    .map(normalizeBrainDumpItem)
    .filter((item): item is NormalizedRoutedItemDraft => Boolean(item))
    .slice(0, MAX_ROUTED_ITEMS);
}
