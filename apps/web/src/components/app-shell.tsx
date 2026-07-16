'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { useHotkeys } from '@/lib/hotkeys';
import { useAppStore } from '@/lib/app-store';
import { ensureOrgSetup } from '@/lib/org-setup';
import { ensureLsgWorkSetup } from '@/lib/lsg-work-setup';
import { wipeLocalData } from '@/lib/reset';
import { CommandPalette } from './command-palette';
import { HelpOverlay } from './help-overlay';
import { TaskEditDrawer } from './task-edit-drawer';
import { WorkLoggerDialog } from './work-logger-dialog';
import { FocusMode } from './focus-mode';
import { DailyReviewTrigger } from './daily-review';
import { ReminderTicker } from './reminder-ticker';
import { SyncBoot } from './sync-boot';
import { AppBadgeSync } from './app-badge-sync';
import { InstallPrompt } from './install-prompt';

export function AppShell() {
  const router = useRouter();
  const togglePalette = useAppStore((s) => s.togglePalette);
  const toggleHelp = useAppStore((s) => s.toggleHelp);
  const openWorkLogger = useAppStore((s) => s.openWorkLogger);
  const openFocus = useAppStore((s) => s.openFocus);
  const closeAll = useCallback(() => {
    const s = useAppStore.getState();
    s.closePalette();
    s.closeHelp();
    s.closeEdit();
    s.closeQuickAdd();
    s.closeWorkLogger();
    s.closeFocus();
    s.closeReview();
  }, []);

  useEffect(() => {
    router.prefetch('/dashboard');
    router.prefetch('/tasks');
    router.prefetch('/projects');
    router.prefetch('/calendar');
    router.prefetch('/inbox');
    router.prefetch('/notepad');
    router.prefetch('/kanban');
    router.prefetch('/power-dialer');
    router.prefetch('/settings');
  }, [router]);

  // One-time clear of the bundled demo data, so the dashboard starts fresh.
  // Guarded so it never wipes real data the user adds later.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('ops:demo-cleared') === '1') return;
    localStorage.setItem('ops:demo-cleared', '1');
    void wipeLocalData();
  }, []);

  // One-time org lane setup: seed the default org and move the known LSG
  // projects into it. Idempotent; no-op on devices with nothing to migrate.
  useEffect(() => {
    void ensureOrgSetup().then(() => ensureLsgWorkSetup());
  }, []);

  useHotkeys([
    { combo: 'mod+k', handler: togglePalette },
    { combo: '?', handler: toggleHelp },
    { combo: 'g then a', handler: () => openWorkLogger('task') },
    { combo: 'g then h', handler: () => router.push('/dashboard') },
    { combo: 'g then t', handler: () => router.push('/tasks') },
    { combo: 'g then p', handler: () => router.push('/projects') },
    { combo: 'g then c', handler: () => router.push('/calendar') },
    { combo: 'g then i', handler: () => router.push('/inbox') },
    { combo: 'g then k', handler: () => router.push('/kanban') },
    { combo: 'g then l', handler: () => router.push('/power-dialer') },
    { combo: 'g then n', handler: () => router.push('/notepad') },
    { combo: 'g then s', handler: () => router.push('/settings') },
    { combo: 'f', handler: openFocus },
    { combo: 'escape', handler: closeAll },
  ]);

  return (
    <>
      <CommandPalette />
      <HelpOverlay />
      <TaskEditDrawer />
      <WorkLoggerDialog />
      <FocusMode />
      <DailyReviewTrigger />
      <ReminderTicker />
      <SyncBoot />
      <AppBadgeSync />
      <InstallPrompt />
    </>
  );
}
