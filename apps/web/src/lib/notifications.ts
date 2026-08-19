'use client';

import { getDb, newId } from '@ops-dashboard/core';
import type { Reminder, Task } from '@ops-dashboard/core';

export type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export function notificationPermission(): PermissionState {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission as PermissionState;
}

export async function requestNotifications(): Promise<PermissionState> {
  if (notificationPermission() === 'unsupported') return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    return result === 'granted' || result === 'denied' || result === 'default'
      ? result
      : notificationPermission();
  } catch {
    return notificationPermission();
  }
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) return existing;
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return null;
  }
}

function reminderFields(taskId: string, triggerAt: string): Pick<Reminder, 'taskId' | 'triggerAt'> {
  const normalizedTaskId = taskId.trim();
  const timestamp = Date.parse(triggerAt.trim());
  if (!normalizedTaskId) throw new Error('Reminder task is required.');
  if (!triggerAt.trim() || !Number.isFinite(timestamp)) {
    throw new Error('Reminder time must be a valid date.');
  }
  return { taskId: normalizedTaskId, triggerAt: new Date(timestamp).toISOString() };
}

export async function scheduleReminder(taskId: string, triggerAt: string): Promise<Reminder> {
  const fields = reminderFields(taskId, triggerAt);
  const db = getDb();
  const task = await db.tasks.get(fields.taskId);
  if (!task || task.deletedAt || task.status === 'done' || task.status === 'archived') {
    throw new Error('Task is not available for reminders.');
  }
  const reminder: Reminder = {
    id: newId(),
    ...fields,
    delivered: false,
  };
  await db.reminders.put(reminder);
  return reminder;
}

export async function cancelReminder(reminderId: string): Promise<void> {
  await getDb().reminders.delete(reminderId);
}

export async function checkAndFireDueReminders(now: Date = new Date()): Promise<number> {
  if (notificationPermission() !== 'granted') return 0;
  if (!Number.isFinite(now.getTime())) return 0;
  const db = getDb();
  // `delivered` is a boolean and cannot be an IndexedDB key; query by the
  // indexed `triggerAt` and filter undelivered in memory.
  const due = await db.reminders
    .where('triggerAt')
    .belowOrEqual(now.toISOString())
    .filter((r) => !r.delivered)
    .toArray();
  let fired = 0;
  for (const r of due) {
    if (!r.triggerAt.trim() || !Number.isFinite(Date.parse(r.triggerAt))) {
      await db.reminders.delete(r.id);
      continue;
    }
    const task = await db.tasks.get(r.taskId);
    if (!task || task.deletedAt || task.status === 'done' || task.status === 'archived') {
      await db.reminders.delete(r.id);
      continue;
    }
    try {
      const reg =
        'serviceWorker' in navigator
          ? await navigator.serviceWorker.getRegistration('/')
          : undefined;
      const opts: NotificationOptions = {
        body: task.notes ?? 'Reminder',
        tag: `ops-${r.id}`,
        data: { taskId: task.id, reminderId: r.id },
      };
      if (reg) await reg.showNotification(task.title, opts);
      else new Notification(task.title, opts);
      fired += 1;
      await db.reminders.update(r.id, { delivered: true });
    } catch {
      /* ignore */
    }
  }
  return fired;
}

export function attachTaskReminder(task: Task, triggerAt: string): Reminder {
  if (task.deletedAt || task.status === 'done' || task.status === 'archived') {
    throw new Error('Task is not available for reminders.');
  }
  return { id: newId(), ...reminderFields(task.id, triggerAt), delivered: false };
}
