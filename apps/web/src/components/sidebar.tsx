'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  BookOpen,
  Calendar,
  Clapperboard,
  Flame,
  FolderKanban,
  Globe,
  Hash,
  Inbox,
  KanbanSquare,
  LayoutGrid,
  ListTodo,
  MessageCircle,
  Pencil,
  Repeat,
  Settings as SettingsIcon,
  Sun,
  Users,
} from 'lucide-react';
import { getDb } from '@drift/core';
import { cn } from '@drift/ui';

interface NavItem {
  href: string;
  label: string;
  icon: typeof Sun;
  shortcut?: string;
}

const PLAN: NavItem[] = [
  { href: '/today', label: 'Today', icon: Sun, shortcut: 'g t' },
  { href: '/inbox', label: 'Inbox', icon: Inbox, shortcut: 'g n' },
  { href: '/tasks', label: 'Tasks', icon: ListTodo },
  { href: '/calendar', label: 'Calendar', icon: Calendar, shortcut: 'g c' },
  { href: '/week', label: 'Week', icon: LayoutGrid, shortcut: 'g w' },
];

const BUILD: NavItem[] = [
  { href: '/routines', label: 'Routines', icon: Repeat },
  { href: '/habits', label: 'Habits', icon: Flame },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/content', label: 'Content', icon: Clapperboard },
  { href: '/kanban', label: 'Kanban', icon: KanbanSquare, shortcut: 'g k' },
];

const LIBRARY: NavItem[] = [
  { href: '/library', label: 'Library', icon: BookOpen },
  { href: '/people', label: 'People', icon: Users },
  { href: '/whiteboards', label: 'Whiteboards', icon: Pencil, shortcut: 'g b' },
];

const META: NavItem[] = [
  { href: '/ask', label: 'Ask', icon: MessageCircle },
  { href: '/domains', label: 'Domains', icon: Globe },
  { href: '/tags', label: 'Tags', icon: Hash },
  { href: '/settings', label: 'Settings', icon: SettingsIcon, shortcut: 'g s' },
];

export function Sidebar() {
  const pathname = usePathname();
  const inboxCount = useLiveQuery(
    () => getDb().captures.where('status').equals('pending').count(),
    [],
    0,
  );

  return (
    <aside
      aria-label="Primary"
      className="hairline scrollbar-thin relative hidden w-[252px] shrink-0 flex-col overflow-y-auto border-r bg-bg-rail/70 backdrop-blur md:flex"
    >
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-3">
        <div
          aria-hidden
          className="flex size-8 items-center justify-center rounded-[10px] bg-primary text-primary-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)]"
        >
          <LayoutGrid className="size-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-semibold tracking-tight">Ops Dashboard</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
            v0.1 / local
          </span>
        </div>
        <span
          aria-hidden
          className="ml-auto inline-flex size-2 rounded-full bg-success live-dot"
          title="Local DB online"
        />
      </div>

      <Section label="Plan">
        {PLAN.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={pathname === item.href}
            badge={item.href === '/inbox' && inboxCount ? inboxCount : undefined}
          />
        ))}
      </Section>

      <Section label="Build">
        {BUILD.map((item) => (
          <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}
      </Section>

      <Section label="Library">
        {LIBRARY.map((item) => (
          <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}
      </Section>

      <div className="mt-auto" />

      <Section label="More">
        {META.map((item) => (
          <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}
      </Section>

      <div className="hairline border-t px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] text-subtle-foreground">
          <span className="font-mono">⌘ K</span>
          <span>command palette</span>
        </div>
      </div>
    </aside>
  );
}

function Section({
  label,
  trailing,
  children,
}: {
  label: string;
  trailing?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-2 pt-3">
      <div className="flex items-center justify-between px-2 pb-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
          {label}
        </span>
        {trailing ? (
          <span className="font-mono text-[10px] text-subtle-foreground">{trailing}</span>
        ) : null}
      </div>
      <nav className="flex flex-col gap-0.5">{children}</nav>
    </div>
  );
}

function NavLink({ item, active, badge }: { item: NavItem; active: boolean; badge?: number }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
        active
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-primary"
        />
      ) : null}
      <Icon className={cn('size-4', active && 'text-primary')} aria-hidden />
      <span className="truncate">{item.label}</span>
      {badge ? (
        <span className="ml-auto inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-medium text-primary-foreground">
          {badge}
        </span>
      ) : item.shortcut ? (
        <span className="ml-auto font-mono text-[10px] text-subtle-foreground opacity-0 transition-opacity group-hover:opacity-100">
          {item.shortcut}
        </span>
      ) : null}
    </Link>
  );
}
