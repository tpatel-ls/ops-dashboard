'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, FolderKanban, LayoutDashboard, ListTodo, Plus } from 'lucide-react';
import { cn } from '@ops-dashboard/ui';
import { useAppStore } from '@/lib/app-store';

const LEFT = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/tasks', label: 'Tasks', icon: ListTodo },
];
const RIGHT = [
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/calendar', label: 'Calendar', icon: Calendar, matches: ['/calendar', '/week', '/month'] },
];

function isActive(pathname: string, item: { href: string; matches?: string[] }): boolean {
  return (item.matches ?? [item.href]).some((path) => pathname.startsWith(path));
}

export function MobileNav() {
  const pathname = usePathname();
  const openWorkLogger = useAppStore((s) => s.openWorkLogger);

  return (
    <nav
      aria-label="Primary"
      className="hairline relative z-40 flex min-h-16 shrink-0 items-stretch justify-around border-t bg-bg-rail/94 px-1.5 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_32px_-28px_rgba(0,0,0,0.8)] backdrop-blur-xl md:hidden"
    >
      {LEFT.map((it) => (
        <Tab key={it.href} {...it} active={isActive(pathname, it)} />
      ))}
      <div className="relative -top-3 mx-1 flex w-16 shrink-0 flex-col items-center">
        <button
          type="button"
          onClick={() => openWorkLogger('task')}
          aria-label="Add task"
          className="flex size-12 items-center justify-center rounded-full border border-primary/30 bg-primary text-primary-foreground shadow-[0_12px_28px_-14px_color-mix(in_oklch,var(--primary)_78%,transparent)] transition-transform active:scale-95"
        >
          <Plus className="size-5" aria-hidden />
        </button>
        <span className="mt-1 text-[10px] font-medium text-primary">
          Add
        </span>
      </div>
      {RIGHT.map((it) => (
        <Tab key={it.href} {...it} active={isActive(pathname, it)} />
      ))}
    </nav>
  );
}

function Tab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Calendar;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 py-2 text-[10px] transition-colors',
        active ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      {active ? (
        <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary" aria-hidden />
      ) : null}
      <Icon className={cn('relative size-[19px]', active && 'text-primary')} aria-hidden />
      <span className="relative max-w-full truncate px-1">{label}</span>
    </Link>
  );
}
