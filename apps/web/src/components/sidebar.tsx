'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  FolderKanban,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  LayoutGrid,
  ListTodo,
  NotebookPen,
  PhoneCall,
  Settings as SettingsIcon,
} from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import { cn } from '@ops-dashboard/ui';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  shortcut?: string;
}

const WORK: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard, shortcut: 'g h' },
  { href: '/tasks', label: 'Tasks', icon: ListTodo, shortcut: 'g t' },
  { href: '/projects', label: 'Projects', icon: FolderKanban, shortcut: 'g p' },
  { href: '/calendar', label: 'Calendar', icon: Calendar, shortcut: 'g c' },
  { href: '/week', label: 'Week', icon: CalendarRange, shortcut: 'g w' },
  { href: '/month', label: 'Month', icon: CalendarDays, shortcut: 'g m' },
  { href: '/inbox', label: 'Inbox', icon: Inbox, shortcut: 'g i' },
];

const TOOLS: NavItem[] = [
  { href: '/kanban', label: 'Kanban', icon: KanbanSquare, shortcut: 'g k' },
  { href: '/power-dialer', label: 'Power Dialer', icon: PhoneCall, shortcut: 'g l' },
  { href: '/notepad', label: 'Notepad', icon: NotebookPen, shortcut: 'g n' },
];

const SYSTEM: NavItem[] = [
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
      className="hairline scrollbar-thin relative hidden w-[224px] shrink-0 flex-col overflow-y-auto border-r bg-bg-rail/78 backdrop-blur md:flex xl:w-[236px]"
    >
      <div className="hairline mx-3 flex h-16 items-center gap-2.5 border-b px-1">
        <div
          aria-hidden
          className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)]"
        >
          <LayoutGrid className="size-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-semibold">Taskify</span>
          <span className="font-mono text-[10px] uppercase text-subtle-foreground">
            Work command
          </span>
        </div>
        <span
          aria-hidden
          className="ml-auto inline-flex size-2 rounded-full bg-success live-dot"
          title="Local DB online"
        />
      </div>

      <Section label="Work">
        {WORK.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={pathname === item.href}
            badge={item.href === '/inbox' && inboxCount ? inboxCount : undefined}
          />
        ))}
      </Section>

      <Section label="Tools">
        {TOOLS.map((item) => (
          <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}
      </Section>

      <div className="mt-auto" />

      <Section label="System">
        {SYSTEM.map((item) => (
          <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}
      </Section>

      <div className="hairline border-t px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-success live-dot" aria-hidden />
          <span className="min-w-0 flex-1 truncate">Local workspace ready</span>
          <span className="kbd shrink-0">Cmd/Ctrl K</span>
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
    <div className="px-2.5 pt-3">
      <div className="flex items-center justify-between px-2 pb-1.5">
        <span className="font-mono text-[10px] uppercase text-subtle-foreground">
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
        'group relative flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors',
        active
          ? 'bg-accent text-foreground shadow-[inset_0_1px_0_0_color-mix(in_oklch,var(--foreground)_6%,transparent)]'
          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-primary"
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
