'use client';

import { getDb, matchByName } from '@ops-dashboard/core';
import type {
  CaptureKind,
  CaptureSource,
  FoodItem,
  MealType,
  Priority,
  Project,
  Routine,
  RoutineCheck,
  Task,
} from '@ops-dashboard/core';
import { createCapture, dismissCapture, setCaptureRoute } from './captures';
import { createFoodLog, deleteFoodLog } from './food-logs';
import { createJournalEntry, deleteJournalEntry } from './journal';
import { createNote, deleteNote } from './notes';
import { createQuote, deleteQuote } from './quotes';
import { todayISO, toggleRoutineCheck } from './routines';
import { addTask, addTaskToProject, softDeleteTask } from './tasks';
import { fetchWithTimeout } from './fetch-timeout';

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

export interface RoutedResult {
  captureId: string;
  kind: CaptureKind;
  title: string;
  recordType: 'task' | 'journalEntry' | 'note' | 'quote' | 'foodLog' | 'routineCheck';
  recordId: string;
  /** e.g. the project name, "640 kcal", or the routine name. */
  detail?: string;
  /** Set on fallback results created while the AI was unreachable. */
  aiOffline?: boolean;
  undo: () => Promise<void>;
}

const MAX_ROUTED_ITEMS = 100;
const MAX_ROUTED_TITLE_LENGTH = 500;
const MAX_ROUTED_NOTES_LENGTH = 2_000;
const MAX_ROUTED_DATE_TEXT_LENGTH = 200;
const MAX_ROUTED_NAME_LENGTH = 200;
const MAX_FOOD_ITEMS = 100;
const MAX_FOOD_TEXT_LENGTH = 200;
const MAX_NUTRITION_ESTIMATE = 1_000_000;

interface RouteContext {
  projects: Project[];
  routines: Routine[];
  source: CaptureSource;
}

/**
 * The universal capture path: send ANY free-form dump (one line or a ramble)
 * through /api/braindump, then file every returned item into its real record
 * through the sync-aware lib helpers. Each item gets its own Capture for the
 * Inbox audit trail and an undo closure that soft-deletes what was created.
 * When the AI is unreachable, every non-empty line becomes a task (NL date
 * parsing still applies) and results are flagged aiOffline.
 */
export async function processBrainDump(
  raw: string,
  source: CaptureSource,
): Promise<RoutedResult[]> {
  const text = raw.trim();
  if (!text) return [];

  const db = getDb();
  const [projects, routines] = await Promise.all([
    db.projects
      .filter(
        (p) => !p.deletedAt && !p.archivedAt && p.status !== 'archived' && p.status !== 'done',
      )
      .toArray(),
    db.routines.filter((r) => !r.deletedAt && !r.archivedAt).toArray(),
  ]);

  let drafts: RoutedItemDraft[] | null = null;
  try {
    const res = await fetchWithTimeout('/api/braindump', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text,
        context: {
          projects: projects.map((p) => p.name),
          routines: routines.map((r) => r.name),
          date: todayISO(),
        },
      }),
    });
    const json = (await res.json()) as { ok?: boolean; items?: RoutedItemDraft[] };
    drafts = acceptedBrainDumpItems(res.ok, json);
  } catch {
    /* network error / offline -> fallback below */
  }

  if (!drafts) return fallbackToTasks(text, source);

  const ctx: RouteContext = { projects, routines, source };
  const results: RoutedResult[] = [];
  for (const draft of drafts) {
    if (typeof draft?.title !== 'string' || !draft.title.trim()) continue;
    try {
      results.push(await routeItem(draft, ctx));
    } catch (err) {
      console.error('[route-items] failed to route an item:', err);
    }
  }
  return results.length > 0 ? results : fallbackToTasks(text, source);
}

export function acceptedBrainDumpItems(
  responseOk: boolean,
  value: unknown,
): RoutedItemDraft[] | null {
  if (!responseOk || !value || typeof value !== 'object') return null;
  const payload = value as { ok?: unknown; items?: unknown };
  if (payload.ok !== true || !Array.isArray(payload.items)) return null;
  const items = payload.items
    .map(normalizeBrainDumpItem)
    .filter((item): item is NormalizedRoutedItemDraft => Boolean(item))
    .slice(0, MAX_ROUTED_ITEMS);
  return items.length > 0 ? items : null;
}

function boundedDraftText(value: unknown, limit: number): string | undefined {
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

async function routeItem(draft: RoutedItemDraft, ctx: RouteContext): Promise<RoutedResult> {
  const title = (draft.title ?? '').trim();
  const aiKind = normalizeCaptureKind(draft.kind);
  const cap = await createCapture(title, ctx.source);

  switch (aiKind) {
    case 'food':
      return routeFood(cap.id, title, draft, ctx.source);
    case 'habit': {
      const routine = matchByName(ctx.routines, draft.routineName ?? title);
      if (routine) return routeHabit(cap.id, title, routine);
      // No matching routine: degrade to a task rather than dropping the item.
      return routeTask(cap.id, aiKind, title, draft, ctx);
    }
    case 'journal':
      return routeJournal(cap.id, title, draft, ctx.source);
    case 'note':
    case 'person':
      return routeNote(cap.id, aiKind, title, draft);
    case 'quote':
      return routeQuote(cap.id, title, draft);
    default:
      // task, event (dated task), and anything unrecognized.
      return routeTask(cap.id, aiKind, title, draft, ctx);
  }
}

async function routeTask(
  captureId: string,
  aiKind: CaptureKind,
  title: string,
  draft: RoutedItemDraft,
  ctx: RouteContext,
): Promise<RoutedResult> {
  const project = matchByName(ctx.projects, draft.projectName);
  const dueText = draft.dueText?.trim();
  const input = dueText ? `${title} ${dueText}` : title;
  const overrides: Partial<Task> = {
    priority: normalizeCapturePriority(draft.priority),
    tags: normalizeCaptureTags(draft.tags),
    ...(draft.notes?.trim() ? { notes: draft.notes.trim() } : {}),
  };
  const task = project
    ? await addTaskToProject(input, project, overrides)
    : await addTask(input, overrides);
  await setCaptureRoute(captureId, { type: 'task', id: task.id }, aiKind, title);
  return {
    captureId,
    kind: aiKind,
    title: task.title,
    recordType: 'task',
    recordId: task.id,
    ...(project ? { detail: project.name } : {}),
    undo: async () => {
      await softDeleteTask(task.id);
      await dismissCapture(captureId);
    },
  };
}

async function routeFood(
  captureId: string,
  title: string,
  draft: RoutedItemDraft,
  source: CaptureSource,
): Promise<RoutedResult> {
  const items = normalizeCaptureFoodItems(draft.food?.items);
  const log = await createFoodLog({
    description: title,
    items,
    mealType: toMealType(draft.food?.mealType),
    source,
  });
  await setCaptureRoute(captureId, { type: 'food', id: log.id }, 'food', title);
  return {
    captureId,
    kind: 'food',
    title,
    recordType: 'foodLog',
    recordId: log.id,
    detail: `${log.totalCalories} kcal`,
    undo: async () => {
      await deleteFoodLog(log.id);
      await dismissCapture(captureId);
    },
  };
}

async function routeHabit(
  captureId: string,
  title: string,
  routine: Routine,
): Promise<RoutedResult> {
  const date = todayISO();
  const existing = await getDb()
    .routineChecks.where('[routineId+date]')
    .equals([routine.id, date])
    .first();
  const changed = routineCaptureNeedsChange(existing);
  if (changed) await toggleRoutineCheck(routine.id, date, true, 'capture');
  await setCaptureRoute(captureId, { type: 'habit', id: routine.id }, 'habit', title);
  return {
    captureId,
    kind: 'habit',
    title,
    recordType: 'routineCheck',
    recordId: routine.id,
    detail: routine.name,
    undo: async () => {
      if (changed) await toggleRoutineCheck(routine.id, date, false, 'capture');
      await dismissCapture(captureId);
    },
  };
}

export function routineCaptureNeedsChange(check: Pick<RoutineCheck, 'done'> | undefined): boolean {
  return !check?.done;
}

async function routeJournal(
  captureId: string,
  title: string,
  draft: RoutedItemDraft,
  source: CaptureSource,
): Promise<RoutedResult> {
  const notes = draft.notes?.trim();
  const entry = await createJournalEntry({
    body: notes ? `${title}\n${notes}` : title,
    source: journalEntrySource(source),
  });
  await setCaptureRoute(captureId, { type: 'journal', id: entry.id }, 'journal', title);
  return {
    captureId,
    kind: 'journal',
    title,
    recordType: 'journalEntry',
    recordId: entry.id,
    undo: async () => {
      await deleteJournalEntry(entry.id);
      await dismissCapture(captureId);
    },
  };
}

export function journalEntrySource(source: CaptureSource): 'voice' | 'text' {
  return source === 'voice' || source === 'watch' ? 'voice' : 'text';
}

async function routeNote(
  captureId: string,
  aiKind: CaptureKind,
  title: string,
  draft: RoutedItemDraft,
): Promise<RoutedResult> {
  const note = await createNote({
    title,
    body: draft.notes?.trim() || title,
    tags: normalizeCaptureTags(draft.tags),
  });
  await setCaptureRoute(captureId, { type: 'note', id: note.id }, aiKind, title);
  return {
    captureId,
    kind: aiKind,
    title,
    recordType: 'note',
    recordId: note.id,
    undo: async () => {
      await deleteNote(note.id);
      await dismissCapture(captureId);
    },
  };
}

async function routeQuote(
  captureId: string,
  title: string,
  draft: RoutedItemDraft,
): Promise<RoutedResult> {
  const quote = await createQuote({ text: title, tags: normalizeCaptureTags(draft.tags) });
  await setCaptureRoute(captureId, { type: 'quote', id: quote.id }, 'quote', title);
  return {
    captureId,
    kind: 'quote',
    title,
    recordType: 'quote',
    recordId: quote.id,
    undo: async () => {
      await deleteQuote(quote.id);
      await dismissCapture(captureId);
    },
  };
}

/** AI unreachable: every non-empty line becomes a task; NL parsing still works. */
async function fallbackToTasks(text: string, source: CaptureSource): Promise<RoutedResult[]> {
  const lines = fallbackCaptureLines(text);
  const results: RoutedResult[] = [];
  for (const line of lines) {
    const cap = await createCapture(line, source);
    const task = await addTask(line);
    await setCaptureRoute(cap.id, { type: 'task', id: task.id });
    results.push({
      captureId: cap.id,
      kind: 'task',
      title: task.title,
      recordType: 'task',
      recordId: task.id,
      aiOffline: true,
      undo: async () => {
        await softDeleteTask(task.id);
        await dismissCapture(cap.id);
      },
    });
  }
  return results;
}

export function fallbackCaptureLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => boundedDraftText(line, MAX_ROUTED_TITLE_LENGTH))
    .filter((line): line is string => Boolean(line))
    .slice(0, MAX_ROUTED_ITEMS);
}

const KNOWN_KINDS: CaptureKind[] = [
  'task',
  'note',
  'journal',
  'event',
  'person',
  'quote',
  'routine',
  'food',
  'habit',
];

export function normalizeCaptureKind(kind: string | undefined): CaptureKind {
  const normalized = kind?.trim().toLocaleLowerCase();
  return KNOWN_KINDS.includes(normalized as CaptureKind) ? (normalized as CaptureKind) : 'task';
}

export function normalizeCapturePriority(p: number | undefined): Priority {
  if (typeof p !== 'number' || !Number.isFinite(p)) return 0;
  return Math.min(3, Math.max(0, Math.round(p))) as Priority;
}

export function normalizeCaptureTags(tags: string[] | undefined): string[] {
  if (!Array.isArray(tags)) return [];
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const value of tags) {
    if (normalized.length >= 20) break;
    if (typeof value !== 'string') continue;
    const tag = Array.from(value.trim().toLocaleLowerCase()).slice(0, 64).join('');
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      normalized.push(tag);
    }
  }
  return normalized;
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function toMealType(v: string | undefined): MealType {
  const normalized = v?.trim().toLowerCase();
  return MEAL_TYPES.includes(normalized as MealType) ? (normalized as MealType) : 'snack';
}

type DraftFoodItem = NonNullable<NonNullable<RoutedItemDraft['food']>['items']>[number];

export function normalizeCaptureFoodItems(value: unknown): FoodItem[] {
  if (!Array.isArray(value)) return [];
  const items: FoodItem[] = [];
  for (const raw of value) {
    if (items.length >= MAX_FOOD_ITEMS) break;
    const item = toFoodItem(raw as DraftFoodItem);
    if (item) items.push(item);
  }
  return items;
}

function boundedFoodText(value: unknown): string {
  return typeof value === 'string'
    ? Array.from(value.trim()).slice(0, MAX_FOOD_TEXT_LENGTH).join('')
    : '';
}

function toFoodItem(raw: DraftFoodItem): FoodItem | null {
  const name = boundedFoodText(raw?.name);
  if (!name) return null;
  const quantity = boundedFoodText(raw?.quantity);
  const protein = roundMacro(raw?.protein);
  const carbs = roundMacro(raw?.carbs);
  const fat = roundMacro(raw?.fat);
  return {
    name,
    ...(quantity ? { quantity } : {}),
    calories: roundMacro(raw?.calories) ?? 0,
    ...(protein !== undefined ? { protein } : {}),
    ...(carbs !== undefined ? { carbs } : {}),
    ...(fat !== undefined ? { fat } : {}),
  };
}

function roundMacro(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v)
    ? Math.min(MAX_NUTRITION_ESTIMATE, Math.max(0, Math.round(v)))
    : undefined;
}
