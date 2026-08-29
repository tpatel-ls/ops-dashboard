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

export function boundedDraftText(value: unknown, limit: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = Array.from(value.trim()).slice(0, limit).join('');
  return text || undefined;
}

export function normalizeBrainDumpItem(value: unknown): NormalizedRoutedItemDraft | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const title = boundedDraftText(input.title, MAX_ROUTED_TITLE_LENGTH);
  if (!title) return null;
  const kind = boundedDraftText(input.kind, 20);
  const notes = boundedDraftText(input.notes, MAX_ROUTED_NOTES_LENGTH);
  const dueText = boundedDraftText(input.dueText, MAX_ROUTED_DATE_TEXT_LENGTH);
  const projectName = boundedDraftText(input.projectName, MAX_ROUTED_NAME_LENGTH);
  const routineName = boundedDraftText(input.routineName, MAX_ROUTED_NAME_LENGTH);
  return {
    title,
    ...(kind ? { kind } : {}),
    ...(notes ? { notes } : {}),
    ...(dueText ? { dueText } : {}),
    ...(typeof input.priority === 'number' ? { priority: input.priority } : {}),
    ...(Array.isArray(input.tags) ? { tags: input.tags as string[] } : {}),
    ...(projectName ? { projectName } : {}),
    ...(routineName ? { routineName } : {}),
    ...(input.food && typeof input.food === 'object'
      ? { food: input.food as RoutedItemDraft['food'] }
      : {}),
  };
}

export function normalizeBrainDumpItems(value: unknown): NormalizedRoutedItemDraft[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeBrainDumpItem)
    .filter((item): item is NormalizedRoutedItemDraft => Boolean(item))
    .slice(0, MAX_ROUTED_ITEMS);
}
