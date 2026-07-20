'use client';

import { Command } from 'cmdk';
import { useLiveQuery } from 'dexie-react-hooks';
import Fuse from 'fuse.js';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Check,
  FolderKanban,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  ListTodo,
  NotebookPen,
  PhoneCall,
  Plus,
  Search,
  Settings as SettingsIcon,
  X,
} from 'lucide-react';
import { getDb, PERSONAL_COLOR } from '@ops-dashboard/core';
import type { OrgContext } from '@ops-dashboard/core';
import { useAppStore } from '@/lib/app-store';
import { useOrgStore } from '@/lib/org-store';
import { addTask } from '@/lib/tasks';
import { destinationOrgId, resolveWorkDestination } from '@/lib/work-logger';
import { useActiveOrgs } from './org-switcher';

const NAV = [
  { id: 'nav-dashboard', label: 'Home', href: '/dashboard', icon: LayoutDashboard, hint: 'g h' },
  { id: 'nav-tasks', label: 'Tasks', href: '/tasks', icon: ListTodo, hint: 'g t' },
  { id: 'nav-projects', label: 'Projects', href: '/projects', icon: FolderKanban, hint: 'g p' },
  { id: 'nav-calendar', label: 'Calendar', href: '/calendar', icon: Calendar, hint: 'g c' },
  { id: 'nav-week', label: 'Week', href: '/week', icon: CalendarRange, hint: 'g w' },
  { id: 'nav-month', label: 'Month', href: '/month', icon: CalendarDays, hint: 'g m' },
  { id: 'nav-inbox', label: 'Inbox', href: '/inbox', icon: Inbox, hint: 'g i' },
  { id: 'nav-kanban', label: 'Kanban', href: '/kanban', icon: KanbanSquare, hint: 'g k' },
  { id: 'nav-power-dialer', label: 'Power Dialer', href: '/power-dialer', icon: PhoneCall, hint: 'g l' },
  { id: 'nav-notepad', label: 'Notepad', href: '/notepad', icon: NotebookPen, hint: 'g n' },
  { id: 'nav-settings', label: 'Settings', href: '/settings', icon: SettingsIcon, hint: 'g s' },
];

export function CommandPalette() {
  const open = useAppStore((s) => s.paletteOpen);
  const close = useAppStore((s) => s.closePalette);
  const openEdit = useAppStore((s) => s.openEdit);
  const ctx = useOrgStore((s) => s.ctx);
  const setCtx = useOrgStore((s) => s.setCtx);
  const orgs = useActiveOrgs();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [adding, startAdd] = useTransition();

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const lanes: { ctx: OrgContext; label: string; color: string }[] = [
    { ctx: 'all', label: 'All work', color: 'var(--primary)' },
    ...(orgs ?? []).map((o) => ({ ctx: o.id as OrgContext, label: o.name, color: o.color })),
    { ctx: 'personal', label: 'Personal', color: PERSONAL_COLOR },
  ];

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

  function handleCreateTask() {
    const text = query.trim();
    if (!text) return;
    startAdd(async () => {
      const destination = resolveWorkDestination(
        ctx,
        null,
        (orgs ?? []).map((organization) => organization.id),
      );
      const orgId = destinationOrgId(destination);
      await addTask(text, orgId ? { orgId } : {});
      close();
      setQuery('');
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-3 pt-3 backdrop-blur-sm sm:px-4 sm:pt-[12vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="command-surface w-full max-w-2xl overflow-hidden rounded-xl">
        <Command label="Command palette" shouldFilter={false} className="flex flex-col">
          <div className="border-b border-hairline px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] uppercase text-subtle-foreground">
                Search and capture
              </span>
              <button
                type="button"
                onClick={close}
                aria-label="Close command palette"
                title="Close"
                className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="flex min-h-12 items-center gap-2 rounded-lg border bg-bg-sunken px-3 py-2">
              <Search className="size-4 text-primary" aria-hidden />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Find tasks, switch workspace, or add a task..."
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-subtle-foreground"
                autoFocus
              />
            </div>
          </div>
          <Command.List className="scrollbar-thin max-h-[calc(100dvh-6rem)] overflow-y-auto p-2 sm:max-h-[60vh]">
            <Command.Empty className="px-3 py-6 text-center text-xs text-muted-foreground">
              {query.trim()
                ? 'No existing tasks match. Create this as a new task above.'
                : 'Start typing to find a task, change workspace, or capture work.'}
            </Command.Empty>

            {/* Prominent task action, always visible when there is text. */}
            {query.trim() ? (
              <Command.Group
                heading="Create"
                className="text-[10px] uppercase text-subtle-foreground"
              >
                <Command.Item
                  value="create-task"
                  keywords={[query]}
                  onSelect={handleCreateTask}
                  disabled={adding}
                  className="group flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-primary-soft data-[selected=true]:text-foreground"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <Plus className="size-3" aria-hidden />
                  </span>
                  <span className="flex-1 truncate">
                    {adding ? 'Adding task...' : (
                      <>
                        <span className="text-muted-foreground">Create task </span>
                        <span className="font-medium">&ldquo;{query}&rdquo;</span>
                      </>
                    )}
                  </span>
                  <span className="font-mono text-[10px] text-subtle-foreground">Enter</span>
                </Command.Item>
              </Command.Group>
            ) : null}

            {results.length > 0 ? (
              <Command.Group
                heading="Tasks"
                className="mt-2 text-[10px] uppercase text-subtle-foreground"
              >
                {results.map((t) => (
                  <Command.Item
                    key={t.id}
                    value={`task-${t.id}`}
                    onSelect={() => {
                      openEdit(t.id);
                      close();
                    }}
                    className="group flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm text-foreground data-[selected=true]:bg-accent"
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
              heading="Context"
              className="mt-2 text-[10px] uppercase text-subtle-foreground"
            >
              {lanes.map((lane) => (
                <Command.Item
                  key={`ctx-${lane.ctx}`}
                  value={`ctx-${lane.ctx}`}
                  keywords={['switch', 'context', lane.label]}
                  onSelect={() => {
                    setCtx(lane.ctx);
                    close();
                  }}
                  className="group flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm text-muted-foreground data-[selected=true]:bg-accent data-[selected=true]:text-foreground"
                >
                  <span
                    className="size-2.5 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]"
                    style={{ background: lane.color }}
                    aria-hidden
                  />
                  <span>Switch to {lane.label}</span>
                  {ctx === lane.ctx ? (
                    <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                      Current
                      <Check className="size-3.5" aria-hidden />
                    </span>
                  ) : null}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group
              heading="Jump"
              className="mt-2 text-[10px] uppercase text-subtle-foreground"
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
                    className="group flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm text-muted-foreground data-[selected=true]:bg-accent data-[selected=true]:text-foreground"
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
