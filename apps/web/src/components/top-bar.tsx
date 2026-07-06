'use client';

import Link from 'next/link';
import { Bell, Radio, Search, Settings, Sparkles } from 'lucide-react';
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
    <header className="hairline relative flex h-16 shrink-0 items-center gap-2 overflow-hidden border-b bg-bg-base/82 px-3 backdrop-blur-xl md:gap-3 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="command-surface flex h-11 min-w-0 max-w-3xl flex-1 items-center gap-2 rounded-[14px] px-2.5 md:px-3">
          <span className="hidden items-center gap-1.5 rounded-full bg-primary/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-primary md:inline-flex">
            <Radio className="size-3" aria-hidden />
            Universal capture
          </span>
          <Sparkles className="size-4 text-primary md:hidden" aria-hidden />
          <QuickAdd />
          <span className="hidden rounded-full border bg-card/65 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle-foreground lg:inline-flex">
            AI route
          </span>
          <div className="hidden items-center gap-1 md:flex">
            <span className="kbd">Enter</span>
            <span className="font-mono text-[10px] text-subtle-foreground">save</span>
          </div>
        </div>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <span className="hidden items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground lg:inline-flex">
          <span
            className={cn(
              'size-1.5 rounded-full',
              online === null && 'bg-muted-foreground',
              online === true && 'live-dot bg-success',
              online === false && 'bg-warning',
            )}
            aria-hidden
          />
          {online === null ? 'Network' : online ? 'Online' : 'Offline'}
        </span>
        <div className="hidden xl:block">
          <SyncStatus showPending={false} />
        </div>
        <div className="hidden sm:block">
          <OrgSwitcher />
        </div>
        <button
          type="button"
          onClick={togglePalette}
          aria-label="Search"
          className="hairline inline-flex size-9 items-center justify-center rounded-[10px] border bg-card text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:h-9 md:w-auto md:gap-2 md:px-3"
        >
          <Search className="size-3.5" aria-hidden />
          <span className="hidden md:inline">Search</span>
          <span className="kbd ml-1 hidden md:inline-flex">⌘ K</span>
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="hairline hidden size-9 items-center justify-center rounded-[10px] border bg-card text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
        >
          <Bell className="size-4" aria-hidden />
        </button>
        <Link
          href="/settings"
          aria-label="Settings"
          className="hairline hidden size-9 items-center justify-center rounded-[10px] border bg-card text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
        >
          <Settings className="size-4" aria-hidden />
        </Link>
        <div className="hidden md:block">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
