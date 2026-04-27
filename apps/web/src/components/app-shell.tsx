'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useHotkeys } from '@/lib/hotkeys';
import { useAppStore } from '@/lib/app-store';
import { CommandPalette } from './command-palette';
import { HelpOverlay } from './help-overlay';
import { TaskEditDrawer } from './task-edit-drawer';
import { QuickAddDialog } from './quick-add-dialog';
import { FocusMode } from './focus-mode';
import { DailyReviewTrigger } from './daily-review';
import { ReminderTicker } from './reminder-ticker';
import { SyncBoot } from './sync-boot';

export function AppShell() {
  const router = useRouter();
  const togglePalette = useAppStore((s) => s.togglePalette);
  const toggleHelp = useAppStore((s) => s.toggleHelp);
  const openQuickAdd = useAppStore((s) => s.openQuickAdd);
  const openFocus = useAppStore((s) => s.openFocus);
  const closeAll = useAppStore((s) => () => {
    s.closePalette();
    s.closeHelp();
    s.closeEdit();
    s.closeQuickAdd();
    s.closeFocus();
    s.closeReview();
  });

  useEffect(() => {
    router.prefetch('/today');
    router.prefetch('/week');
    router.prefetch('/inbox');
  }, [router]);

  useHotkeys([
    { combo: 'mod+k', handler: togglePalette },
    { combo: '?', handler: toggleHelp },
    { combo: 'g then i', handler: openQuickAdd },
    { combo: 'g then t', handler: () => router.push('/today') },
    { combo: 'g then w', handler: () => router.push('/week') },
    { combo: 'g then m', handler: () => router.push('/month') },
    { combo: 'g then c', handler: () => router.push('/calendar') },
    { combo: 'g then k', handler: () => router.push('/kanban') },
    { combo: 'g then b', handler: () => router.push('/whiteboards') },
    { combo: 'g then n', handler: () => router.push('/inbox') },
    { combo: 'g then s', handler: () => router.push('/settings') },
    { combo: 'f', handler: openFocus },
    { combo: 'escape', handler: closeAll },
  ]);

  return (
    <>
      <CommandPalette />
      <HelpOverlay />
      <TaskEditDrawer />
      <QuickAddDialog />
      <FocusMode />
      <DailyReviewTrigger />
      <ReminderTicker />
      <SyncBoot />
    </>
  );
}
