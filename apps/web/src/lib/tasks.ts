'use client';

import {
  getDb,
  getDeviceId,
  newId,
  parseQuickAdd,
  projectNextTask,
  quickAddToTask,
} from '@drift/core';
import type { ChecklistItem, Task } from '@drift/core';
import { enqueueOp } from './sync-queue';

export async function addTask(input: string, overrides: Partial<Task> = {}): Promise<Task> {
  const parsed = parseQuickAdd(input);
  const db = getDb();
  const last = await db.tasks.orderBy('order').last();
  const order = (last?.order ?? 0) + 1;
  const task: Task = {
    ...quickAddToTask(parsed, { id: newId(), deviceId: getDeviceId(), order }),
    ...overrides,
  };
  await db.tasks.put(task);
  await enqueueOp({ table: 'tasks', recordId: task.id, op: 'put', payload: task });
  return task;
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  const db = getDb();
  const existing = await db.tasks.get(id);
  if (!existing) return;
  const merged: Task = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
    version: existing.version + 1,
  };
  await db.tasks.put(merged);
  await enqueueOp({ table: 'tasks', recordId: id, op: 'put', payload: merged });
}

export async function setTaskStatus(id: string, status: Task['status']): Promise<void> {
  const db = getDb();
  const existing = await db.tasks.get(id);
  if (!existing) return;
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
      const newTask: Task = {
        ...projected,
        id: newId(),
        order: (last?.order ?? 0) + 1,
        deviceId: getDeviceId(),
      };
      await db.tasks.put(newTask);
      await enqueueOp({ table: 'tasks', recordId: newTask.id, op: 'put', payload: newTask });
    }
  }
}

export async function softDeleteTask(id: string): Promise<void> {
  const db = getDb();
  const existing = await db.tasks.get(id);
  if (!existing) return;
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
