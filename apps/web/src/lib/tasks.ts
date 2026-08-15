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
import type { ChecklistItem, Project, Reminder, Task, TaskStatus } from '@ops-dashboard/core';
import { enqueueOp } from './sync-queue';

const TASK_STATUSES = new Set<TaskStatus>([
  'backlog',
  'todo',
  'doing',
  'blocked',
  'done',
  'archived',
]);

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

function assertTaskFields(patch: Partial<Task>): void {
  if (patch.scheduledFor !== undefined && localDay(patch.scheduledFor) !== patch.scheduledFor) {
    throw new Error('Task schedule must be a valid calendar day.');
  }
  for (const key of ['startAt', 'endAt', 'dueAt'] as const) {
    const value = patch[key];
    if (value !== undefined && (!value.trim() || !Number.isFinite(Date.parse(value)))) {
      throw new Error(`Task ${key} must be a valid date.`);
    }
  }
  for (const key of ['estimateMinutes', 'actualMinutes'] as const) {
    const value = patch[key];
    if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
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
  if (!parsed.title.trim()) throw new Error('Task title is required.');
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
  assertTaskFields(mutableOverrides);
  const db = getDb();
  const last = await db.tasks.orderBy('order').last();
  const order = nextTaskOrder(last?.order);
  const task: Task = {
    ...quickAddToTask(parsed, { id: newId(), deviceId: getDeviceId(), order }),
    ...mutableOverrides,
  };
  await db.tasks.put(task);
  await enqueueOp({ table: 'tasks', recordId: task.id, op: 'put', payload: task });
  return task;
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  const mutablePatch = { ...patch };
  if (mutablePatch.title !== undefined) {
    mutablePatch.title = mutablePatch.title.trim();
    if (!mutablePatch.title) throw new Error('Task title is required.');
  }
  assertTaskFields(mutablePatch);
  const db = getDb();
  const existing = await db.tasks.get(id);
  if (!existing || existing.deletedAt) return;
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
