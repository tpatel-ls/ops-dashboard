'use client';

import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@ops-dashboard/core';
import { updateAppBadge } from '@/lib/app-badge';

export function AppBadgeSync() {
  const count = useLiveQuery(async () => {
    const db = getDb();
    const [pendingCaptures, openTasks] = await Promise.all([
      db.captures.where('status').equals('pending').count(),
      db.tasks
        .filter((task) => !task.deletedAt && task.status !== 'done' && task.status !== 'archived')
        .count(),
    ]);

    return Math.min(99, pendingCaptures + openTasks);
  }, []);

  useEffect(() => {
    if (count === undefined) return;
    void updateAppBadge(count);
  }, [count]);

  return null;
}
