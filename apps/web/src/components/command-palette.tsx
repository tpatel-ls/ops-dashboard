'use client';

import { Command } from 'cmdk';
import { useLiveQuery } from 'dexie-react-hooks';
import Fuse from 'fuse.js';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  Calendar,
  Hash,
  Inbox,
  KanbanSquare,
  LayoutGrid,
  Pencil,
  Settings as SettingsIcon,
  Sun,
  Target,
} from 'lucide-react';
import { getDb } from '@drift/core';
import { useAppStore } from '@/lib/app-store';

const NAV = [
  { id: 'nav-today', label: 'Today', href: '/today', icon: Sun, hint: 'g t' },
  { id: 'nav-week', label: 'Week', href: '/week', icon: LayoutGrid, hint: 'g w' },
  { id: 'nav-month', label: 'Month', href: '/month', icon: Calendar, hint: 'g m' },
  { id: 'nav-calendar', label: 'Calendar', href: '/calendar', icon: Calendar, hint: 'g c' },
  { id: 'nav-kanban', label: 'Kanban', href: '/kanban', icon: KanbanSquare, hint: 'g k' },
  { id: 'nav-whiteboards', label: 'Whiteboards', href: '/whiteboards', icon: Pencil, hint: 'g b' },
  { id: 'nav-inbox', label: 'Inbox', href: '/inbox', icon: Inbox, hint: 'g n' },
  { id: 'nav-tags', label: 'Tags', href: '/tags', icon: Hash },
  { id: 'nav-projects', label: 'Projects', href: '/projects', icon: Target },
  { id: 'nav-settings', label: 'Settings', href: '/settings', icon: SettingsIcon, hint: 'g s' },
];

export function CommandPalette() {
  const open = useAppStore((s) => s.paletteOpen);
  const close = useAppStore((s) => s.closePalette);
  const openEdit = useAppStore((s) => s.openEdit);
  const router = useRouter();
  const [query, setQuery] = useState('');

  const tasks = useLiveQuery(async () => {
    const db = getDb();
    const all = await db.tasks.toArray();
    return all.filter((t) => !t.deletedAt);
  });

  const fuse = useMemo(() => {
    if (!tasks) return null;
    return new Fuse(tasks, {
      keys: [
        { name: 'title', weight: 0.7 },
        { name: 'notes', weight: 0.2 },
        { name: 'tags', weight: 0.1 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
    });
  }, [tasks]);

  const results = query && fuse ? fuse.search(query).slice(0, 8).map((r) => r.item) : [];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="surface w-full max-w-xl overflow-hidden">
        <Command label="Command palette" shouldFilter={false} className="flex flex-col">
          <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-subtle-foreground">
              Search
            </span>
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Find tasks, jump to a view..."
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-subtle-foreground"
              autoFocus
            />
            <span className="kbd">Esc</span>
          </div>
          <Command.List className="scrollbar-thin max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-xs text-muted-foreground">
              No matches.
            </Command.Empty>
            {results.length > 0 ? (
              <Command.Group
                heading="Tasks"
                className="text-[10px] uppercase tracking-[0.18em] text-subtle-foreground"
              >
                {results.map((t) => (
                  <Command.Item
                    key={t.id}
                    value={`task-${t.id}`}
                    onSelect={() => {
                      openEdit(t.id);
                      close();
                    }}
                    className="group flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm text-foreground data-[selected=true]:bg-accent"
                  >
                    <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                    <span className="truncate">{t.title}</span>
                    {t.tags.length ? (
                      <span className="ml-auto truncate font-mono text-[10px] text-subtle-foreground">
                        #{t.tags[0]}
                      </span>
                    ) : null}
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}
            <Command.Group
              heading="Jump"
              className="mt-2 text-[10px] uppercase tracking-[0.18em] text-subtle-foreground"
            >
              {NAV.map((n) => {
                const Icon = n.icon;
                return (
                  <Command.Item
                    key={n.id}
                    value={n.id}
                    keywords={[n.label]}
                    onSelect={() => {
                      router.push(n.href);
                      close();
                    }}
                    className="group flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm text-muted-foreground data-[selected=true]:bg-accent data-[selected=true]:text-foreground"
                  >
                    <Icon className="size-4" aria-hidden />
                    <span>{n.label}</span>
                    {n.hint ? (
                      <span className="ml-auto font-mono text-[10px] text-subtle-foreground">
                        {n.hint}
                      </span>
                    ) : null}
                  </Command.Item>
                );
              })}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
