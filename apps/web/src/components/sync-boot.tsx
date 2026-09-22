'use client';

import { useEffect } from 'react';
import { useLiveSettings } from '@/lib/use-settings';
import { startSync, stopSync } from '@/lib/sync/engine';

/**
 * Starts and stops the realtime engine from this device's persisted sync toggle.
 * Authentication events are handled inside the engine without changing the
 * user's explicit preference.
 *
 * The toggle is read through `useLiveSettings` rather than straight out of
 * Dexie: `normalizeSettings` is what decides whether a stored value is a
 * usable boolean, and a settings row restored from a backup or written by an
 * older build can hold anything. `Boolean(stored)` turned such a value into
 * an engine start the user never asked for.
 */
export function SyncBoot() {
  const enabled = useLiveSettings().syncEnabled;

  useEffect(() => {
    if (enabled) void startSync();
    else void stopSync();
    return () => {
      void stopSync();
    };
  }, [enabled]);

  return null;
}
