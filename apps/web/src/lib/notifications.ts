'use client';

import { getDb, newId } from '@drift/core';
import type { Reminder, Task } from '@drift/core';

export type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export function notificationPermission(): PermissionState {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission as PermissionState;
}

export async function requestNotifications(): Promise<PermissionState> {
  if (notificationPermission() === 'unsupported') return 'unsupported';
  const result = await Notification.requestPermission();
  return result as PermissionState;
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

export async function scheduleReminder(taskId: string, triggerAt: string): Promise<Reminder> {
  const db = getDb();
  const reminder: Reminder = { id: newId(), taskId, triggerAt, delivered: false };
  await db.reminders.put(reminder);
  return reminder;
}

export async function cancelReminder(reminderId: string): Promise<void> {
  await getDb().reminders.delete(reminderId);
}

export async function checkAndFireDueReminders(now: Date = new Date()): Promise<number> {
  if (notificationPermission() !== 'granted') return 0;
  const db = getDb();
  const due = await db.reminders
    .where('delivered')
    .equals(0 as unknown as never)
    .filter((r) => !r.delivered && new Date(r.triggerAt) <= now)
    .toArray();
  let fired = 0;
  for (const r of due) {
    const task = await db.tasks.get(r.taskId);
    if (!task) continue;
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      const opts: NotificationOptions = {
        body: task.notes ?? 'Reminder',
        tag: `drift-${r.id}`,
        data: { taskId: task.id, reminderId: r.id },
      };
      if (reg) await reg.showNotification(task.title, opts);
      else new Notification(task.title, opts);
      fired += 1;
    } catch {
      /* ignore */
    }
    await db.reminders.update(r.id, { delivered: true });
  }
  return fired;
}

export function attachTaskReminder(task: Task, triggerAt: string): Reminder {
  return { id: newId(), taskId: task.id, triggerAt, delivered: false };
}
