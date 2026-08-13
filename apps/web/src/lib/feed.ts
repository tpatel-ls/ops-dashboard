'use client';

import { getDb } from '@ops-dashboard/core';
import type { AppNotification, NotificationKind } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';

const NOTIFICATION_KINDS = new Set<NotificationKind>([
  'capture',
  'reminder',
  'summary',
  'review',
  'system',
]);

/** Append an item to the in-app notification feed (Today / Inbox bell). */
export function pushNotification(input: {
  title: string;
  body?: string;
  kind: NotificationKind;
  refType?: string;
  refId?: string;
}): Promise<AppNotification> {
  const title = input.title.trim();
  const body = input.body?.trim();
  if (!title) throw new Error('Notification title is required.');
  if (!NOTIFICATION_KINDS.has(input.kind)) {
    throw new Error('Notification kind must be valid.');
  }
  const refType = input.refType?.trim();
  const refId = input.refId?.trim();

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
