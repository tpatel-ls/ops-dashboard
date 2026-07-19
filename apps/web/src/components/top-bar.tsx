'use client';

import Link from 'next/link';
import { Plus, Search, Settings } from 'lucide-react';
import { cn } from '@ops-dashboard/ui';
import { useAppStore } from '@/lib/app-store';
import { useNetworkStatus } from '@/lib/use-network-status';
import { ThemeToggle } from './theme-toggle';
import { QuickAdd } from './quick-add';
import { OrgSwitcher } from './org-switcher';
import { SyncStatus } from './sync-status';

export function TopBar() {
  const togglePalette = useAppStore((s) => s.togglePalette);
  const online = useNetworkStatus();

  return (
    <header className="hairline relative flex h-14 shrink-0 items-center gap-2 overflow-hidden border-b bg-bg-base/88 px-2.5 backdrop-blur-xl sm:px-3 md:gap-3 md:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="command-surface flex h-10 min-w-0 max-w-3xl flex-1 items-center gap-2 rounded-lg px-2.5 md:px-3">
          <span className="hidden items-center gap-1.5 rounded-full bg-primary/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-primary lg:inline-flex">
            <Plus className="size-3" aria-hidden />
            Capture
          </span>
          <Plus className="size-4 shrink-0 text-primary lg:hidden" aria-hidden />
          <QuickAdd />
          <div className="hidden items-center gap-1 xl:flex">
            <span className="kbd">Enter</span>
            <span className="font-mono text-[10px] text-subtle-foreground">add</span>
          </div>
        </div>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <span
          aria-label={online === null ? 'Checking network' : online ? 'Network online' : 'Network offline'}
          title={online === null ? 'Checking network' : online ? 'Network online' : 'Network offline'}
          className="hidden size-9 items-center justify-center rounded-lg border bg-card text-xs text-muted-foreground xl:inline-flex"
        >
          <span
            className={cn(
              'size-2 rounded-full',
              online === null && 'bg-muted-foreground',
              online === true && 'live-dot bg-success',
              online === false && 'bg-warning',
            )}
            aria-hidden
          />
        </span>
        <div className="hidden 2xl:block">
          <SyncStatus showPending={false} />
        </div>
        <div>
          <OrgSwitcher />
        </div>
        <button
          type="button"
          onClick={togglePalette}
          aria-label="Open command search"
          title="Search and commands"
          className="hairline inline-flex size-9 items-center justify-center rounded-lg border bg-card text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:w-auto lg:gap-2 lg:px-3"
        >
          <Search className="size-3.5" aria-hidden />
          <span className="hidden lg:inline">Search</span>
          <span className="kbd ml-1 hidden xl:inline-flex">⌘ K</span>
        </button>
        <Link
          href="/settings"
          aria-label="Settings"
          className="hairline hidden size-9 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:text-foreground lg:inline-flex"
        >
          <Settings className="size-4" aria-hidden />
        </Link>
        <div className="hidden lg:block">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
