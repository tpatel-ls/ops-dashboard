'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import {
  Calendar,
  CalendarCheck,
  ChevronDown,
  FolderKanban,
  Inbox,
  KanbanSquare,
  LayoutGrid,
  ListTodo,
  NotebookPen,
  PhoneCall,
  Settings as SettingsIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getDb } from '@ops-dashboard/core';
import { cn } from '@ops-dashboard/ui';

interface NavItem {
  href: string;
  label: string;
  icon: typeof CalendarCheck;
  shortcut?: string;
  matches?: string[];
}

const PRIMARY: NavItem[] = [
  { href: '/dashboard', label: 'Today', icon: CalendarCheck, shortcut: 'g h' },
  { href: '/tasks', label: 'Tasks', icon: ListTodo, shortcut: 'g t' },
  { href: '/kanban', label: 'Board', icon: KanbanSquare, shortcut: 'g k' },
  { href: '/projects', label: 'Projects', icon: FolderKanban, shortcut: 'g p' },
];

const SECONDARY: NavItem[] = [
  {
    href: '/calendar',
    label: 'Calendar',
    icon: Calendar,
    shortcut: 'g c',
    matches: ['/calendar', '/week', '/month'],
  },
  { href: '/inbox', label: 'Inbox', icon: Inbox, shortcut: 'g i' },
  { href: '/notepad', label: 'Notepad', icon: NotebookPen, shortcut: 'g n' },
  { href: '/power-dialer', label: 'Power Dialer', icon: PhoneCall, shortcut: 'g l' },
];

function isActive(pathname: string, item: NavItem): boolean {
  return (item.matches ?? [item.href]).some((path) => pathname.startsWith(path));
}

export function Sidebar() {
  const pathname = usePathname();
  const inboxCount = useLiveQuery(
    () => getDb().captures.where('status').equals('pending').count(),
    [],
    0,
  );
  const secondaryActive = SECONDARY.some((item) => isActive(pathname, item));

  return (
    <aside
      aria-label="Primary"
      className="hairline scrollbar-thin relative hidden w-[210px] shrink-0 flex-col overflow-y-auto border-r bg-bg-rail/82 md:flex xl:w-[220px]"
    >
      <div className="hairline mx-3 flex h-16 items-center gap-2.5 border-b px-1">
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
        >
          <LayoutGrid className="size-4" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[15px] font-semibold">Taskify</span>
          <span className="text-[11px] text-subtle-foreground">Your tasks</span>
        </span>
      </div>

      <Section label="Tasks">
        {PRIMARY.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item)} />
        ))}
      </Section>

      <details className="group mx-2.5 mt-4" open={secondaryActive || undefined}>
        <summary className="flex min-h-10 list-none items-center gap-2 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground">
          <ChevronDown
            className="size-3.5 transition-transform group-open:rotate-180"
            aria-hidden
          />
          More
        </summary>
        <nav className="mt-1 flex flex-col gap-0.5">
          {SECONDARY.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(pathname, item)}
              badge={item.href === '/inbox' && inboxCount ? inboxCount : undefined}
            />
          ))}
        </nav>
      </details>

      <div className="mt-auto p-2.5">
        <NavLink
          item={{ href: '/settings', label: 'Settings', icon: SettingsIcon, shortcut: 'g s' }}
          active={pathname.startsWith('/settings')}
        />
      </div>
    </aside>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-2.5 pt-4">
      <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase text-subtle-foreground">
        {label}
      </p>
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
        'group relative flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors',
        active
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
      )}
    >
      {active ? (
        <span className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-primary" aria-hidden />
      ) : null}
      <Icon className={cn('size-4', active && 'text-primary')} aria-hidden />
      <span className="truncate">{item.label}</span>
      {badge ? (
        <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
          {badge}
        </span>
      ) : item.shortcut ? (
        <span className="ml-auto text-[10px] text-subtle-foreground opacity-0 transition-opacity group-hover:opacity-100">
          {item.shortcut}
        </span>
      ) : null}
    </Link>
  );
}
