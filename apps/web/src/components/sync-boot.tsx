'use client';

import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@ops-dashboard/core';
import { createClient } from '@/utils/supabase/client';
import { updateSettings } from '@/lib/settings';
import { startSync, stopSync } from '@/lib/sync/engine';

/**
 * Drives the realtime sync engine.
 *
 * 1. Auto-enables sync once you're signed in. This is a single-user personal
 *    dashboard - being signed in means you want your data on this device - so we
 *    flip the local `syncEnabled` toggle on automatically instead of making you
 *    find it in Settings on every device. (The toggle still works as an off
 *    switch; it just defaults on while authenticated.)
 * 2. Starts/stops the engine in response to that toggle.
 */
export function SyncBoot() {
  const enabled = useLiveQuery(async () => {
    const s = await getDb().settings.get('singleton');
    return Boolean(s?.syncEnabled);
  });

  // Auto-enable sync whenever there's an authenticated session.
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const sb = supabase; // pin non-null for the closures below
    let cancelled = false;

    async function enableIfSignedIn() {
      const { data } = await sb.auth.getSession();
      if (cancelled || !data.session) return;
      const s = await getDb().settings.get('singleton');
      if (!s?.syncEnabled) await updateSettings({ syncEnabled: true });
    }

    void enableIfSignedIn();
    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        void enableIfSignedIn();
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (enabled) void startSync();
    else void stopSync();
    return () => {
      void stopSync();
    };
  }, [enabled]);

  return null;
}
