'use client';

import { create } from 'zustand';

interface AppStore {
  paletteOpen: boolean;
  helpOpen: boolean;
  quickAddOpen: boolean;
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
  editTaskId: null,
  focusOpen: false,
  reviewOpen: false,
  openPalette: () => set({ paletteOpen: true }),
  closePalette: () => set({ paletteOpen: false }),
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),
  openHelp: () => set({ helpOpen: true }),
  closeHelp: () => set({ helpOpen: false }),
  toggleHelp: () => set((s) => ({ helpOpen: !s.helpOpen })),
  openQuickAdd: () => set({ quickAddOpen: true }),
  closeQuickAdd: () => set({ quickAddOpen: false }),
  openEdit: (id) => set({ editTaskId: id }),
  closeEdit: () => set({ editTaskId: null }),
  openFocus: () => set({ focusOpen: true }),
  closeFocus: () => set({ focusOpen: false }),
  openReview: () => set({ reviewOpen: true }),
  closeReview: () => set({ reviewOpen: false }),
}));
