'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { getDb } from '@ops-dashboard/core';
import { markAllNotificationsRead, markNotificationRead } from '@/lib/feed';
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
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
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
        <Bell className="size-3.5 text-primary" aria-hidden />
        <span
          id="notifications-title"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground"
        >
          Notifications
        </span>
        <span className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground">
          {notifications === undefined ? 'Loading' : `${notifications.length} unread`}
        </span>
        {notifications && notifications.length > 0 ? (
          <button
            type="button"
            onClick={() => markAllNotificationsRead()}
            className="ml-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Mark all as read"
          >
            <CheckCheck className="size-3" aria-hidden />
            All read
          </button>
        ) : null}
      </div>

      {notifications && notifications.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border">
          {notifications.map((n) => (
          <li key={n.id} className="flex items-start gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="truncate text-[13px] leading-5">{n.title}</span>
                <span
                  className={cn(
                    'shrink-0 rounded bg-bg-sunken px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground',
                  )}
                >
                  {KIND_LABEL[n.kind] ?? n.kind}
                </span>
              </div>
              {n.body && (
                <p className="mt-0.5 text-[12px] text-muted-foreground line-clamp-2">{n.body}</p>
              )}
              <p className="mt-0.5 font-mono text-[10px] text-subtle-foreground">
                {formatDistanceToNow(parseISO(n.createdAt), { addSuffix: true })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => markNotificationRead(n.id)}
              className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Mark as read"
            >
              <Check className="size-3.5" aria-hidden />
            </button>
          </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-5 text-sm text-muted-foreground">
          {notifications === undefined ? 'Loading notifications.' : 'You are all caught up.'}
        </p>
      )}
    </section>
  );
}
