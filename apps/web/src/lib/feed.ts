'use client';

import { getDb } from '@ops-dashboard/core';
import type { AppNotification, NotificationKind } from '@ops-dashboard/core';
import { formatDistance, isValid, parseISO } from 'date-fns';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';

const NOTIFICATION_KINDS = new Set<NotificationKind>([
  'capture',
  'reminder',
  'summary',
  'review',
  'system',
]);

export function notificationAge(createdAt: string, now: Date = new Date()): string {
  const created = parseISO(createdAt);
  if (!isValid(created) || !isValid(now)) return 'Recently';
  return formatDistance(created, now, { addSuffix: true });
}

/** Append an item to the in-app notification feed (Today / Inbox bell). */
export function pushNotification(input: {
  title: string;
  body?: string;
  kind: NotificationKind;
  refType?: string;
  refId?: string;
}): Promise<AppNotification> {
  if (typeof input.title !== 'string') throw new Error('Notification title is required.');
  if (input.body !== undefined && typeof input.body !== 'string') {
    throw new Error('Notification body must be valid.');
  }
  if (input.refType !== undefined && typeof input.refType !== 'string') {
    throw new Error('Notification reference must be valid.');
  }
  if (input.refId !== undefined && typeof input.refId !== 'string') {
    throw new Error('Notification reference must be valid.');
  }
  const title = input.title.trim();
  const body = input.body?.trim();
  if (!title) throw new Error('Notification title is required.');
  if (!NOTIFICATION_KINDS.has(input.kind)) {
    throw new Error('Notification kind must be valid.');
  }
  const refType = input.refType?.trim();
  const refId = input.refId?.trim();
  if (Boolean(refType) !== Boolean(refId)) {
    throw new Error('Notification reference must include a type and id.');
  }

  return putRecord(
    'notifications',
    newRecord<AppNotification>({
      title,
      ...(body ? { body } : {}),
      kind: input.kind,
      ...(refType ? { refType } : {}),
      ...(refId ? { refId } : {}),
    }),
  );
}

export const markNotificationRead = (id: string) =>
  patchRecord<AppNotification>('notifications', id, { readAt: new Date().toISOString() });

export const deleteNotification = (id: string) =>
  softDeleteRecord<AppNotification>('notifications', id);

export async function markAllNotificationsRead(): Promise<void> {
  const all = await getDb()
    .notifications.filter((n) => !n.readAt && !n.deletedAt)
    .toArray();
  const now = new Date().toISOString();
  await Promise.all(
    all.map((n) => patchRecord<AppNotification>('notifications', n.id, { readAt: now })),
  );
}
