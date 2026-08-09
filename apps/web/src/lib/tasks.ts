'use client';

import {
  getDb,
  getDeviceId,
  localDay,
  newId,
  parseQuickAdd,
  projectNextTask,
  quickAddToTask,
} from '@ops-dashboard/core';
import type { ChecklistItem, Project, Reminder, Task } from '@ops-dashboard/core';
import { enqueueOp } from './sync-queue';

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
  const db = getDb();
  const last = await db.tasks.orderBy('order').last();
  const order = (last?.order ?? 0) + 1;
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
  if (
    mutablePatch.scheduledFor !== undefined &&
    localDay(mutablePatch.scheduledFor) !== mutablePatch.scheduledFor
  ) {
    throw new Error('Task schedule must be a valid calendar day.');
  }
  for (const key of ['startAt', 'endAt', 'dueAt'] as const) {
    const value = mutablePatch[key];
    if (value !== undefined && (!value.trim() || !Number.isFinite(Date.parse(value)))) {
      throw new Error(`Task ${key} must be a valid date.`);
    }
  }
  for (const key of ['estimateMinutes', 'actualMinutes'] as const) {
    const value = mutablePatch[key];
    if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
      throw new Error(`Task ${key} must be a non-negative integer.`);
    }
  }
  const db = getDb();
  const existing = await db.tasks.get(id);
  if (!existing || existing.deletedAt) return;
  for (const key of ['id', 'createdAt', 'updatedAt', 'version', 'deviceId', 'deletedAt'] as const) {
    delete mutablePatch[key];
  }
  const merged: Task = {
    ...existing,
    ...mutablePatch,
    updatedAt: new Date().toISOString(),
    version: existing.version + 1,
  };
  await db.tasks.put(merged);
  await enqueueOp({ table: 'tasks', recordId: id, op: 'put', payload: merged });
}

export async function setTaskStatus(id: string, status: Task['status']): Promise<void> {
  const db = getDb();
  const existing = await db.tasks.get(id);
  if (!existing || existing.deletedAt) return;
  if (existing.status === status) return;
  const now = new Date().toISOString();
  const next: Task = {
    ...existing,
    status,
    updatedAt: now,
    version: existing.version + 1,
    ...(status === 'done' ? { completedAt: now } : { completedAt: undefined }),
  };
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
        order: (last?.order ?? 0) + 1,
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
  const tomb: Task = {
    ...existing,
    deletedAt: now,
    updatedAt: now,
    version: existing.version + 1,
  };
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
