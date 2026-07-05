'use client';

import Link from 'next/link';
import { Bell, Radio, Search, Settings, Sparkles } from 'lucide-react';
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
    <header className="hairline relative flex h-16 shrink-0 items-center gap-3 border-b bg-bg-base/82 px-4 backdrop-blur-xl md:px-6">
      <div className="flex flex-1 items-center gap-2">
        <div className="command-surface flex h-11 max-w-3xl flex-1 items-center gap-2 rounded-[14px] px-3">
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
      <div className="ml-auto flex items-center gap-1.5">
        <span className="hidden items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground lg:inline-flex">
          <span
            className={online ? 'live-dot size-1.5 rounded-full bg-success' : 'size-1.5 rounded-full bg-warning'}
            aria-hidden
          />
          {online ? 'Online' : 'Offline'}
        </span>
        <div className="hidden xl:block">
          <SyncStatus showPending={false} />
        </div>
        <OrgSwitcher />
        <button
          type="button"
          onClick={togglePalette}
          aria-label="Search"
          className="hairline inline-flex h-9 items-center gap-2 rounded-[10px] border bg-card px-3 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Search className="size-3.5" aria-hidden />
          <span className="hidden md:inline">Search</span>
          <span className="kbd ml-1">⌘ K</span>
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="hairline inline-flex size-9 items-center justify-center rounded-[10px] border bg-card text-muted-foreground transition-colors hover:text-foreground"
        >
          <Bell className="size-4" aria-hidden />
        </button>
        <Link
          href="/settings"
          aria-label="Settings"
          className="hairline inline-flex size-9 items-center justify-center rounded-[10px] border bg-card text-muted-foreground transition-colors hover:text-foreground"
        >
          <Settings className="size-4" aria-hidden />
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
