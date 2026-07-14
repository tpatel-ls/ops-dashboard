'use client';

import { create } from 'zustand';

export type WorkLoggerMode = 'task' | 'project' | 'progress';

interface AppStore {
  paletteOpen: boolean;
  helpOpen: boolean;
  quickAddOpen: boolean;
  workLoggerOpen: boolean;
  workLoggerMode: WorkLoggerMode;
  workLoggerProjectId: string | null;
  editTaskId: string | null;
  focusOpen: boolean;
  reviewOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
  openHelp: () => void;
  closeHelp: () => void;
  toggleHelp: () => void;
  openQuickAdd: () => void;
  closeQuickAdd: () => void;
  openWorkLogger: (mode?: WorkLoggerMode, projectId?: string | null) => void;
  closeWorkLogger: () => void;
  openEdit: (id: string) => void;
  closeEdit: () => void;
  openFocus: () => void;
  closeFocus: () => void;
  openReview: () => void;
  closeReview: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  paletteOpen: false,
  helpOpen: false,
  quickAddOpen: false,
  workLoggerOpen: false,
  workLoggerMode: 'task',
  workLoggerProjectId: null,
  editTaskId: null,
  focusOpen: false,
  reviewOpen: false,
  openPalette: () => set({ paletteOpen: true }),
  closePalette: () => set({ paletteOpen: false }),
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),
  openHelp: () => set({ helpOpen: true }),
  closeHelp: () => set({ helpOpen: false }),
  toggleHelp: () => set((s) => ({ helpOpen: !s.helpOpen })),
  openQuickAdd: () =>
    set({
      quickAddOpen: true,
      workLoggerOpen: true,
      workLoggerMode: 'task',
      workLoggerProjectId: null,
    }),
  closeQuickAdd: () => set({ quickAddOpen: false, workLoggerOpen: false }),
  openWorkLogger: (mode = 'task', projectId = null) =>
    set({
      quickAddOpen: false,
      workLoggerOpen: true,
      workLoggerMode: mode,
      workLoggerProjectId: projectId,
    }),
  closeWorkLogger: () =>
    set({
      quickAddOpen: false,
      workLoggerOpen: false,
      workLoggerMode: 'task',
      workLoggerProjectId: null,
    }),
  openEdit: (id) => set({ editTaskId: id }),
  closeEdit: () => set({ editTaskId: null }),
  openFocus: () => set({ focusOpen: true }),
  closeFocus: () => set({ focusOpen: false }),
  openReview: () => set({ reviewOpen: true }),
  closeReview: () => set({ reviewOpen: false }),
}));
