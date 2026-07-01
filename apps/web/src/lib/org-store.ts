'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OrgContext } from '@ops-dashboard/core';

interface OrgStore {
  ctx: OrgContext;
  setCtx: (ctx: OrgContext) => void;
}

/**
 * The active org lens over the work views (Dashboard, Projects, Tasks,
 * Kanban, Calendar). Per-device by design: persisted in localStorage, never
 * synced, so the phone and the laptop can sit on different lanes.
 */
export const useOrgStore = create<OrgStore>()(
  persist(
    (set) => ({
      ctx: 'all',
      setCtx: (ctx) => set({ ctx }),
    }),
    { name: 'ops:org-context' },
  ),
);
