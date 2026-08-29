'use client';

import {
  bumpVersion,
  getDb,
  getDeviceId,
  localDay,
  newId,
  parseQuickAdd,
  projectNextTask,
  quickAddToTask,
} from '@ops-dashboard/core';
import type {
  ChecklistItem,
  Project,
  RecurrenceRule,
  Reminder,
  Task,
  TaskStatus,
} from '@ops-dashboard/core';
import { enqueueOp } from './sync-queue';
import { normalizeStringList } from './string-list';

const TASK_STATUSES = new Set<TaskStatus>([
  'backlog',
  'todo',
  'doing',
  'blocked',
  'done',
  'archived',
]);
const RECURRENCE_FREQUENCIES = new Set<RecurrenceRule['freq']>([
  'daily',
  'weekly',
  'monthly',
  'yearly',
]);
const RECURRENCE_DAYS = new Set<NonNullable<RecurrenceRule['byDay']>[number]>([
  'MO',
  'TU',
  'WE',
  'TH',
  'FR',
  'SA',
  'SU',
]);
const MAX_TASK_TITLE_LENGTH = 500;

function normalizedTaskTitle(value: string): string {
  const title = value.trim();
  if (!title) throw new Error('Task title is required.');
  if (Array.from(title).length > MAX_TASK_TITLE_LENGTH) {
    throw new Error('Task title must contain at most 500 characters.');
  }
  return title;
}

export function availableTask(task: Task | undefined): Task | null {
  return task && !task.deletedAt ? task : null;
}

function assertTaskStatus(value: unknown): asserts value is TaskStatus {
  if (typeof value !== 'string' || !TASK_STATUSES.has(value as TaskStatus)) {
    throw new Error('Task status must be valid.');
  }
}

function nextTaskOrder(previous: number | undefined): number {
  if (typeof previous !== 'number' || !Number.isFinite(previous)) return 1;
  const next = previous + 1;
  return Number.isFinite(next) ? next : 1;
}

function normalizeTaskCollections(patch: Partial<Task>): void {
  if (Object.hasOwn(patch, 'tags')) {
    patch.tags = normalizeStringList(patch.tags, 'Task tags must be valid.');
  }
  if (Object.hasOwn(patch, 'checklist')) {
    if (!Array.isArray(patch.checklist)) throw new Error('Task checklist must be valid.');
    const seen = new Set<string>();
    patch.checklist = patch.checklist.map((item) => {
      if (
        !item ||
        typeof item !== 'object' ||
        typeof item.id !== 'string' ||
        typeof item.text !== 'string' ||
        typeof item.done !== 'boolean'
      ) {
        throw new Error('Task checklist must be valid.');
      }
      const id = item.id.trim();
      const text = item.text.trim();
      if (!id || !text || seen.has(id)) throw new Error('Task checklist must be valid.');
      seen.add(id);
      return { id, text, done: item.done };
    });
  }
}

function normalizeTaskRecurrence(patch: Partial<Task>): void {
  if (!Object.hasOwn(patch, 'recurrence') || patch.recurrence === undefined) return;
  const value = patch.recurrence;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Task recurrence must be valid.');
  }
  if (
    !RECURRENCE_FREQUENCIES.has(value.freq) ||
    !Number.isSafeInteger(value.interval) ||
    value.interval < 1
  ) {
    throw new Error('Task recurrence must be valid.');
  }
  let byDay: RecurrenceRule['byDay'];
  if (value.byDay !== undefined) {
    if (!Array.isArray(value.byDay) || value.byDay.some((day) => !RECURRENCE_DAYS.has(day))) {
      throw new Error('Task recurrence must be valid.');
    }
    byDay = [...new Set(value.byDay)];
  }
  if (value.endsOn !== undefined && localDay(value.endsOn) !== value.endsOn) {
    throw new Error('Task recurrence end date must be valid.');
  }
  if (value.count !== undefined && (!Number.isSafeInteger(value.count) || value.count < 1)) {
    throw new Error('Task recurrence count must be a positive integer.');
  }
  patch.recurrence = {
    freq: value.freq,
    interval: value.interval,
    ...(byDay !== undefined ? { byDay } : {}),
    ...(value.endsOn !== undefined ? { endsOn: value.endsOn } : {}),
    ...(value.count !== undefined ? { count: value.count } : {}),
  };
}

function normalizeTaskReminders(patch: Partial<Task>, ownerTaskId: string): void {
  if (!Object.hasOwn(patch, 'reminders')) return;
  if (!Array.isArray(patch.reminders)) throw new Error('Task reminders must be valid.');
  const seen = new Set<string>();
  patch.reminders = patch.reminders.map((reminder) => {
    if (
      !reminder ||
      typeof reminder !== 'object' ||
      typeof reminder.id !== 'string' ||
      typeof reminder.taskId !== 'string' ||
      typeof reminder.triggerAt !== 'string' ||
      typeof reminder.delivered !== 'boolean'
    ) {
      throw new Error('Task reminders must be valid.');
    }
    const id = reminder.id.trim();
    const timestamp = Date.parse(reminder.triggerAt);
    if (!id || !Number.isFinite(timestamp) || seen.has(id)) {
      throw new Error('Task reminders must be valid.');
    }
    if (reminder.offsetMinutes !== undefined && !Number.isSafeInteger(reminder.offsetMinutes)) {
      throw new Error('Task reminder offset must be an integer.');
    }
    seen.add(id);
    return {
      id,
      taskId: ownerTaskId,
      triggerAt: new Date(timestamp).toISOString(),
      delivered: reminder.delivered,
      ...(reminder.offsetMinutes !== undefined ? { offsetMinutes: reminder.offsetMinutes } : {}),
    };
  });
}

function assertTaskFields(patch: Partial<Task>, ownerTaskId: string): void {
  normalizeTaskCollections(patch);
  normalizeTaskRecurrence(patch);
  normalizeTaskReminders(patch, ownerTaskId);
  if (patch.notes !== undefined) {
    if (typeof patch.notes !== 'string') throw new Error('Task notes must be valid.');
    patch.notes = patch.notes.trim() || undefined;
  }
  for (const key of ['projectId', 'orgId', 'domainId', 'contentId', 'parentId'] as const) {
    const value = patch[key];
    if (value !== undefined) {
      if (typeof value !== 'string') throw new Error('Task references must be valid.');
      patch[key] = value.trim() || undefined;
    }
  }
  if (patch.scheduledFor !== undefined && localDay(patch.scheduledFor) !== patch.scheduledFor) {
    throw new Error('Task schedule must be a valid calendar day.');
  }
  for (const key of ['startAt', 'endAt', 'dueAt'] as const) {
    const value = patch[key];
    if (value !== undefined && (!value.trim() || !Number.isFinite(Date.parse(value)))) {
      throw new Error(`Task ${key} must be a valid date.`);
    }
    if (value !== undefined) patch[key] = new Date(Date.parse(value)).toISOString();
  }
  for (const key of ['estimateMinutes', 'actualMinutes'] as const) {
    const value = patch[key];
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) {
      throw new Error(`Task ${key} must be a non-negative integer.`);
    }
  }
  if (patch.order !== undefined && !Number.isFinite(patch.order)) {
    throw new Error('Task order must be finite.');
  }
  if (patch.status !== undefined) assertTaskStatus(patch.status);
  if (
    patch.priority !== undefined &&
    (!Number.isInteger(patch.priority) || patch.priority < 0 || patch.priority > 3)
  ) {
    throw new Error('Task priority must be an integer from 0 to 3.');
  }
  if (patch.starred !== undefined && typeof patch.starred !== 'boolean') {
    throw new Error('Task starred state must be boolean.');
  }
}

function assertTaskTimeRange(task: Pick<Task, 'startAt' | 'endAt'>): void {
  if (!task.startAt || !task.endAt) return;
  const start = Date.parse(task.startAt);
  const end = Date.parse(task.endAt);
  if (Number.isFinite(start) && Number.isFinite(end) && end <= start) {
    throw new Error('Task end time must be after its start time.');
  }
}

/** Add a task straight into a project, inheriting its domain and org lane. */
export function addTaskToProject(
  input: string,
  project: Project,
  overrides: Partial<Task> = {},
): Promise<Task> {
  return addTask(input, {
    ...overrides,
    projectId: project.id,
    domainId: project.domainId,
    orgId: project.orgId,
  });
}

export async function addTask(input: string, overrides: Partial<Task> = {}): Promise<Task> {
  const parsed = parseQuickAdd(input);
  parsed.title = normalizedTaskTitle(parsed.title);
  const mutableOverrides = { ...overrides };
  for (const key of [
    'id',
    'title',
    'createdAt',
    'updatedAt',
    'version',
    'deviceId',
    'deletedAt',
  ] as const) {
    delete mutableOverrides[key];
  }
  const id = newId();
  assertTaskFields(mutableOverrides, id);
  assertTaskTimeRange({ ...parsed, ...mutableOverrides });
  const db = getDb();
  const last = await db.tasks.orderBy('order').last();
  const order = nextTaskOrder(last?.order);
  const task: Task = {
    ...quickAddToTask(parsed, { id, deviceId: getDeviceId(), order }),
    ...mutableOverrides,
  };
  await db.tasks.put(task);
  await enqueueOp({ table: 'tasks', recordId: task.id, op: 'put', payload: task });
  return task;
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  const mutablePatch = { ...patch };
  if (mutablePatch.title !== undefined) {
    if (typeof mutablePatch.title !== 'string') throw new Error('Task title is required.');
    mutablePatch.title = normalizedTaskTitle(mutablePatch.title);
  }
  assertTaskFields(mutablePatch, id);
  const db = getDb();
  const existing = await db.tasks.get(id);
  if (!existing || existing.deletedAt) return;
  if (Object.hasOwn(mutablePatch, 'startAt') || Object.hasOwn(mutablePatch, 'endAt')) {
    assertTaskTimeRange({ ...existing, ...mutablePatch });
  }
  for (const key of ['id', 'createdAt', 'updatedAt', 'version', 'deviceId', 'deletedAt'] as const) {
    delete mutablePatch[key];
  }
  const changed = Object.entries(mutablePatch).some(
    ([key, value]) => !Object.is((existing as Task & Record<string, unknown>)[key], value),
  );
  if (!changed) return;
  const merged = bumpVersion<Task>({
    ...existing,
    ...mutablePatch,
  });
  await db.tasks.put(merged);
  await enqueueOp({ table: 'tasks', recordId: id, op: 'put', payload: merged });
}

export async function setTaskStatus(id: string, status: Task['status']): Promise<void> {
  assertTaskStatus(status);
  const db = getDb();
  const existing = await db.tasks.get(id);
  if (!existing || existing.deletedAt) return;
  if (existing.status === status) return;
  const now = new Date().toISOString();
  const next = bumpVersion<Task>({
    ...existing,
    status,
    ...(status === 'done' ? { completedAt: now } : { completedAt: undefined }),
  });
  await db.tasks.put(next);
  await enqueueOp({ table: 'tasks', recordId: id, op: 'put', payload: next });

  if (status === 'done' && existing.recurrence) {
    const projected = projectNextTask(existing);
    if (projected) {
      const last = await db.tasks.orderBy('order').last();
      const newTaskId = newId();
      const reminders = projectRecurringReminders(existing, projected, newTaskId);
      const newTask: Task = {
        ...projected,
        id: newTaskId,
        reminders,
        order: nextTaskOrder(last?.order),
        deviceId: getDeviceId(),
      };
      await db.tasks.put(newTask);
      if (reminders.length > 0) await db.reminders.bulkPut(reminders);
      await enqueueOp({ table: 'tasks', recordId: newTask.id, op: 'put', payload: newTask });
    }
  }
}

function recurrenceAnchor(task: Task): number | undefined {
  const value = task.scheduledFor ? `${task.scheduledFor}T00:00:00` : (task.startAt ?? task.dueAt);
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

export function projectRecurringReminders(
  previous: Task,
  projected: Task,
  taskId: string,
): Reminder[] {
  const previousAnchor = recurrenceAnchor(previous);
  const nextAnchor = recurrenceAnchor(projected);
  if (previousAnchor === undefined || nextAnchor === undefined) return [];
  const shift = nextAnchor - previousAnchor;

  return previous.reminders.flatMap((reminder) => {
    const trigger = Date.parse(reminder.triggerAt);
    if (!Number.isFinite(trigger)) return [];
    const shiftedTrigger = new Date(trigger + shift);
    if (!Number.isFinite(shiftedTrigger.getTime())) return [];
    return [
      {
        ...reminder,
        id: newId(),
        taskId,
        triggerAt: shiftedTrigger.toISOString(),
        delivered: false,
      },
    ];
  });
}

export async function softDeleteTask(id: string): Promise<void> {
  const db = getDb();
  const existing = await db.tasks.get(id);
  if (!existing || existing.deletedAt) return;
  const now = new Date().toISOString();
  const tomb = bumpVersion<Task>({
    ...existing,
    deletedAt: now,
  });
  await db.tasks.put(tomb);
  await enqueueOp({ table: 'tasks', recordId: id, op: 'delete', payload: tomb });
}

export async function reorderTask(id: string, order: number): Promise<void> {
  await updateTask(id, { order });
}

export async function rescheduleTask(id: string, scheduledFor: string | undefined): Promise<void> {
  await updateTask(id, scheduledFor ? { scheduledFor } : { scheduledFor: undefined });
}

export async function setChecklist(id: string, checklist: ChecklistItem[]): Promise<void> {
  await updateTask(id, { checklist });
}
