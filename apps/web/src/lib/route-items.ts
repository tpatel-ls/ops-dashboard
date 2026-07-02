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
} from '@ops-dashboard/core';
import { createCapture, dismissCapture, setCaptureRoute } from './captures';
import { createFoodLog, deleteFoodLog } from './food-logs';
import { createJournalEntry, deleteJournalEntry } from './journal';
import { createNote, deleteNote } from './notes';
import { createQuote, deleteQuote } from './quotes';
import { todayISO, toggleRoutineCheck } from './routines';
import { addTask, addTaskToProject, softDeleteTask } from './tasks';

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
    const res = await fetch('/api/braindump', {
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
    if (json.ok && Array.isArray(json.items) && json.items.length > 0) drafts = json.items;
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

async function routeItem(draft: RoutedItemDraft, ctx: RouteContext): Promise<RoutedResult> {
  const title = (draft.title ?? '').trim();
  const aiKind = normalizeKind(draft.kind);
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
      return routeJournal(cap.id, title, draft);
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
  const task = project
    ? await addTaskToProject(input, project)
    : await addTask(input, {
        priority: clampPriority(draft.priority),
        tags: cleanTags(draft.tags),
        ...(draft.notes?.trim() ? { notes: draft.notes.trim() } : {}),
      });
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
  const items = (draft.food?.items ?? [])
    .map(toFoodItem)
    .filter((i): i is FoodItem => i !== null);
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
  await toggleRoutineCheck(routine.id, date, true, 'capture');
  await setCaptureRoute(captureId, { type: 'habit', id: routine.id }, 'habit', title);
  return {
    captureId,
    kind: 'habit',
    title,
    recordType: 'routineCheck',
    recordId: routine.id,
    detail: routine.name,
    undo: async () => {
      await toggleRoutineCheck(routine.id, date, false, 'capture');
      await dismissCapture(captureId);
    },
  };
}

async function routeJournal(
  captureId: string,
  title: string,
  draft: RoutedItemDraft,
): Promise<RoutedResult> {
  const notes = draft.notes?.trim();
  const entry = await createJournalEntry({
    body: notes ? `${title}\n${notes}` : title,
    source: 'text',
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

async function routeNote(
  captureId: string,
  aiKind: CaptureKind,
  title: string,
  draft: RoutedItemDraft,
): Promise<RoutedResult> {
  const note = await createNote({
    title,
    body: draft.notes?.trim() || title,
    tags: cleanTags(draft.tags),
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
  const quote = await createQuote({ text: title, tags: cleanTags(draft.tags) });
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
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
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

function normalizeKind(kind: string | undefined): CaptureKind {
  return KNOWN_KINDS.includes(kind as CaptureKind) ? (kind as CaptureKind) : 'task';
}

function clampPriority(p: number | undefined): Priority {
  if (typeof p !== 'number' || Number.isNaN(p)) return 0;
  return Math.min(3, Math.max(0, Math.round(p))) as Priority;
}

function cleanTags(tags: string[] | undefined): string[] {
  if (!Array.isArray(tags)) return [];
  return tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function toMealType(v: string | undefined): MealType {
  return MEAL_TYPES.includes(v as MealType) ? (v as MealType) : 'snack';
}

type DraftFoodItem = NonNullable<NonNullable<RoutedItemDraft['food']>['items']>[number];

function toFoodItem(raw: DraftFoodItem): FoodItem | null {
  const name = typeof raw?.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;
  const quantity = typeof raw.quantity === 'string' ? raw.quantity.trim() : '';
  const protein = roundMacro(raw.protein);
  const carbs = roundMacro(raw.carbs);
  const fat = roundMacro(raw.fat);
  return {
    name,
    ...(quantity ? { quantity } : {}),
    calories: roundMacro(raw.calories) ?? 0,
    ...(protein !== undefined ? { protein } : {}),
    ...(carbs !== undefined ? { carbs } : {}),
    ...(fat !== undefined ? { fat } : {}),
  };
}

function roundMacro(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : undefined;
}
