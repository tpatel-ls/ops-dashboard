'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import {
  compareNotificationRecency,
  markAllNotificationsRead,
  markNotificationRead,
  notificationAge,
} from '@/lib/feed';
import { cn } from '@ops-dashboard/ui';

const KIND_LABEL: Record<string, string> = {
  capture: 'capture',
  reminder: 'reminder',
  summary: 'summary',
  review: 'review',
  system: 'system',
};

export function NotificationsFeed() {
  const notifications = useLiveQuery(async () => {
    const all = await getDb().notifications.toArray();
    return all
      .filter((n) => !n.deletedAt && !n.readAt)
      .sort(compareNotificationRecency)
      .slice(0, 5);
  });

  return (
    <section
      id="notifications"
      tabIndex={-1}
      aria-labelledby="notifications-title"
      aria-busy={notifications === undefined}
      className="surface-flat scroll-mt-20"
    >
      <div className="hairline flex items-center gap-1.5 border-b px-4 py-2.5">
        <Bell className="text-primary size-3.5" aria-hidden />
        <span
          id="notifications-title"
          className="text-subtle-foreground font-mono text-[10px] tracking-[0.18em] uppercase"
        >
          Notifications
        </span>
        <span className="text-muted-foreground ml-auto font-mono text-[10px] tabular-nums">
          {notifications === undefined ? 'Loading' : `${notifications.length} unread`}
        </span>
        {notifications && notifications.length > 0 ? (
          <button
            type="button"
            onClick={() => markAllNotificationsRead()}
            className="text-muted-foreground hover:bg-accent hover:text-foreground ml-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] transition-colors"
            aria-label="Mark all as read"
          >
            <CheckCheck className="size-3" aria-hidden />
            All read
          </button>
        ) : null}
      </div>

      {notifications && notifications.length > 0 ? (
        <ul className="divide-border flex flex-col divide-y">
          {notifications.map((n) => (
            <li key={n.id} className="flex items-start gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-[13px] leading-5">{n.title}</span>
                  <span
                    className={cn(
                      'bg-bg-sunken text-muted-foreground shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] tracking-[0.1em] uppercase',
                    )}
                  >
                    {KIND_LABEL[n.kind] ?? n.kind}
                  </span>
                </div>
                {n.body && (
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[12px]">{n.body}</p>
                )}
                <p className="text-subtle-foreground mt-0.5 font-mono text-[10px]">
                  {notificationAge(n.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => markNotificationRead(n.id)}
                className="text-muted-foreground hover:bg-accent hover:text-foreground mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md transition-colors"
                aria-label="Mark as read"
              >
                <Check className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground px-4 py-5 text-sm">
          {notifications === undefined ? 'Loading notifications.' : 'You are all caught up.'}
        </p>
      )}
    </section>
  );
}
