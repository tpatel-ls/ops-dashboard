'use client';

import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@drift/core';
import { startSync, stopSync } from '@/lib/sync-worker-client';

export function SyncBoot() {
  const enabled = useLiveQuery(async () => {
    const s = await getDb().settings.get('singleton');
    return Boolean(s?.syncEnabled);
  });

  useEffect(() => {
    if (enabled) startSync();
    else stopSync();
    return () => stopSync();
  }, [enabled]);

  return null;
}
