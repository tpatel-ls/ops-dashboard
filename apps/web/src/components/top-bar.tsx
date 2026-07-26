'use client';

import { CheckSquare2, Search } from 'lucide-react';
import { useAppStore } from '@/lib/app-store';
import { OrgSwitcher } from './org-switcher';
import { QuickAdd } from './quick-add';

export function TopBar() {
  const togglePalette = useAppStore((state) => state.togglePalette);

  return (
    <header className="hairline bg-bg-base/92 relative flex h-14 shrink-0 items-center gap-2 border-b px-2.5 backdrop-blur-xl sm:px-3 md:gap-3 md:px-5">
      <div className="flex min-w-0 flex-1 items-center md:hidden">
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <CheckSquare2 className="text-primary size-4" aria-hidden />
          Taskify
        </span>
      </div>

      <div className="hidden max-w-4xl min-w-0 flex-1 md:block">
        <div className="command-surface flex h-10 min-w-0 items-center rounded-lg px-3">
          <QuickAdd />
        </div>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <OrgSwitcher />
        <button
          type="button"
          onClick={togglePalette}
          aria-label="Open search and commands"
          aria-keyshortcuts="Meta+K Control+K"
          title="Search and commands"
          className="hairline bg-card text-muted-foreground hover:bg-accent hover:text-foreground inline-flex size-10 items-center justify-center rounded-lg border transition-colors lg:h-9 lg:w-auto lg:gap-2 lg:px-3"
        >
          <Search className="size-4" aria-hidden />
          <span className="hidden lg:inline">Search</span>
          <span className="kbd ml-1 hidden xl:inline-flex">⌘ K</span>
        </button>
      </div>
    </header>
  );
}
