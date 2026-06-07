'use client';

import { getDb } from '@drift/core';
import type { AppNotification, NotificationKind } from '@drift/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';

/** Append an item to the in-app notification feed (Today / Inbox bell). */
export function pushNotification(input: {
  title: string;
  body?: string;
  kind: NotificationKind;
  refType?: string;
  refId?: string;
}): Promise<AppNotification> {
  return putRecord(
    'notifications',
    newRecord<AppNotification>({
      title: input.title,
      ...(input.body ? { body: input.body } : {}),
      kind: input.kind,
      ...(input.refType ? { refType: input.refType } : {}),
      ...(input.refId ? { refId: input.refId } : {}),
    }),
  );
}

export const markNotificationRead = (id: string) =>
  patchRecord<AppNotification>('notifications', id, { readAt: new Date().toISOString() });

export const deleteNotification = (id: string) =>
  softDeleteRecord<AppNotification>('notifications', id);

export async function markAllNotificationsRead(): Promise<void> {
  const all = await getDb().notifications.filter((n) => !n.readAt && !n.deletedAt).toArray();
  const now = new Date().toISOString();
  await Promise.all(
    all.map((n) => patchRecord<AppNotification>('notifications', n.id, { readAt: now })),
  );
}
