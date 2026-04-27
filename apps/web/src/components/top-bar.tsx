'use client';

import { Bell, Search, Sparkles } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { QuickAdd } from './quick-add';

export function TopBar() {
  return (
    <header className="hairline relative flex h-16 shrink-0 items-center gap-3 border-b bg-bg-base/70 px-4 backdrop-blur-md md:px-6">
      <div className="flex flex-1 items-center gap-2">
        <div className="surface-flat flex h-10 max-w-2xl flex-1 items-center gap-2 px-3 shadow-sm">
          <Sparkles className="size-4 text-primary" aria-hidden />
          <QuickAdd />
          <div className="hidden items-center gap-1 md:flex">
            <span className="kbd">Enter</span>
            <span className="font-mono text-[10px] text-subtle-foreground">save</span>
          </div>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Search"
          className="hairline inline-flex h-9 items-center gap-2 rounded-[10px] border bg-card px-3 text-xs text-muted-foreground transition-colors hover:text-foreground"
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
        <ThemeToggle />
      </div>
    </header>
  );
}
