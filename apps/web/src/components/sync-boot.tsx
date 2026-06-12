'use client';

import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@ops-dashboard/core';
import { startSync, stopSync } from '@/lib/sync/engine';

/** Starts/stops the realtime sync engine in response to the local sync toggle. */
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
