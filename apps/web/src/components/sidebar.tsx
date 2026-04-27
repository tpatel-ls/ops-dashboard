'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  ClipboardList,
  Hash,
  Inbox,
  KanbanSquare,
  LayoutGrid,
  Pencil,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
} from 'lucide-react';
import { cn } from '@drift/ui';

interface NavItem {
  href: string;
  label: string;
  icon: typeof Sun;
  shortcut?: string;
  badge?: string;
}

const PLAN: NavItem[] = [
  { href: '/today', label: 'Today', icon: Sun, shortcut: 'g t' },
  { href: '/week', label: 'Week', icon: LayoutGrid, shortcut: 'g w' },
  { href: '/month', label: 'Month', icon: Calendar, shortcut: 'g m' },
  { href: '/calendar', label: 'Calendar', icon: Calendar, shortcut: 'g c' },
  { href: '/inbox', label: 'Inbox', icon: Inbox, shortcut: 'g n' },
];

const WORK: NavItem[] = [
  { href: '/kanban', label: 'Kanban', icon: KanbanSquare, shortcut: 'g k' },
  { href: '/whiteboards', label: 'Whiteboards', icon: Pencil, shortcut: 'g b' },
];

const META: NavItem[] = [
  { href: '/projects', label: 'Projects', icon: ClipboardList },
  { href: '/tags', label: 'Tags', icon: Hash },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
];

const SAMPLE_PROJECTS = [
  { id: 'home', name: 'Home', color: 'oklch(0.7 0.16 150)' },
  { id: 'work', name: 'Work', color: 'oklch(0.72 0.16 60)' },
  { id: 'reading', name: 'Reading', color: 'oklch(0.65 0.18 280)' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Primary"
      className="hairline relative hidden w-[252px] shrink-0 flex-col border-r bg-bg-rail/70 backdrop-blur md:flex"
    >
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-3">
        <div
          aria-hidden
          className="flex size-8 items-center justify-center rounded-[10px] bg-primary text-primary-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)]"
        >
          <Sparkles className="size-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-semibold tracking-tight">Drift</span>
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
          <NavLink key={item.href} item={item} active={pathname === item.href} />
        ))}
      </Section>

      <Section label="Work">
        {WORK.map((item) => (
          <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}
      </Section>

      <Section label="Projects" trailing="3">
        {SAMPLE_PROJECTS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <span
              aria-hidden
              className="size-2.5 rounded-[3px] ring-1 ring-inset ring-black/5"
              style={{ background: p.color }}
            />
            <span className="truncate">{p.name}</span>
            <span className="ml-auto font-mono text-[10px] text-subtle-foreground">0</span>
          </button>
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

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
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
      {item.shortcut ? (
        <span className="ml-auto font-mono text-[10px] text-subtle-foreground opacity-0 transition-opacity group-hover:opacity-100">
          {item.shortcut}
        </span>
      ) : null}
    </Link>
  );
}
