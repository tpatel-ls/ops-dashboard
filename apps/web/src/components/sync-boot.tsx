'use client';

import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@ops-dashboard/core';
import { startSync, stopSync } from '@/lib/sync/engine';

/**
 * Starts and stops the realtime engine from this device's persisted sync toggle.
 * Authentication events are handled inside the engine without changing the
 * user's explicit preference.
 */
export function SyncBoot() {
  const enabled = useLiveQuery(async () => {
    const s = await getDb().settings.get('singleton');
    return Boolean(s?.syncEnabled);
  });

  useEffect(() => {
    if (enabled) void startSync();
    else void stopSync();
    return () => {
      void stopSync();
    };
  }, [enabled]);

  return null;
}
