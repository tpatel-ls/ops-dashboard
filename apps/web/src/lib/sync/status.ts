'use client';

import { create } from 'zustand';

export type SyncState =
  | 'off' // sync disabled
  | 'unconfigured' // no Supabase env
  | 'signed-out' // enabled + configured, but no session
  | 'connecting'
  | 'live'
  | 'offline'
  | 'error';

interface SyncStatusStore {
  state: SyncState;
  pending: number;
  lastSyncedAt: string | null;
  error: string | null;
  set: (patch: Partial<Omit<SyncStatusStore, 'set'>>) => void;
}

export const useSyncStatus = create<SyncStatusStore>((set) => ({
  state: 'off',
  pending: 0,
  lastSyncedAt: null,
  error: null,
  set: (patch) => set(patch),
}));

/** Imperative setter for use outside React (the engine). */
export function setSyncStatus(patch: Partial<Omit<SyncStatusStore, 'set'>>): void {
  useSyncStatus.getState().set(patch);
}
