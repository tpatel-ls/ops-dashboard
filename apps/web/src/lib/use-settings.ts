'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@ops-dashboard/core';
import type { Settings } from '@ops-dashboard/core';
import { normalizeSettings } from './settings';

/**
 * Live settings, normalized the same way `getSettings` normalizes them.
 *
 * Components used to read the singleton straight out of Dexie and fall back
 * per field with `settings?.field ?? DEFAULT_SETTINGS.field`. `??` only
 * replaces null and undefined, so any other stored value passed through
 * untouched, and the week views then asserted the result was `0 | 1` with a
 * cast. Settings are written through `normalizeSettings`, but synced rows
 * reach Dexie through `fromRow`, which casts without validating, so a stored
 * `weekStartsOn` of 3 or a `pomodoroFocusMinutes` of 0 or NaN was possible and
 * reached date-fns and the focus timer unchecked.
 */
export function useLiveSettings(): Settings {
  const stored = useLiveQuery(async () => getDb().settings.get('singleton'));
  return normalizeSettings(stored);
}
