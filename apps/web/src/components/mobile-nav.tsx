'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarCheck, FolderKanban, KanbanSquare, ListTodo, Plus } from 'lucide-react';
import { cn } from '@ops-dashboard/ui';
import { useAppStore } from '@/lib/app-store';

const LEFT = [
  { href: '/dashboard', label: 'Today', icon: CalendarCheck },
  { href: '/tasks', label: 'Tasks', icon: ListTodo },
];
const RIGHT = [
  { href: '/kanban', label: 'Board', icon: KanbanSquare },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
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
      className="hairline bg-bg-rail/94 relative z-40 flex min-h-[calc(4rem+env(safe-area-inset-bottom))] shrink-0 items-stretch justify-around border-t px-1.5 pt-1 pb-[max(env(safe-area-inset-bottom),0.25rem)] shadow-[0_-12px_32px_-28px_rgba(0,0,0,0.8)] backdrop-blur-xl md:hidden"
    >
      {LEFT.map((it) => (
        <Tab key={it.href} {...it} active={isActive(pathname, it)} />
      ))}
      <div className="relative -top-3 mx-1 flex w-16 shrink-0 flex-col items-center">
        <button
          type="button"
          onClick={() => openWorkLogger('task')}
          aria-label="Add task"
          aria-haspopup="dialog"
          className="border-primary/30 bg-primary text-primary-foreground flex size-12 touch-manipulation items-center justify-center rounded-full border shadow-[0_12px_28px_-14px_color-mix(in_oklch,var(--primary)_78%,transparent)] transition-transform active:scale-95"
        >
          <Plus className="size-5" aria-hidden />
        </button>
        <span className="text-primary mt-1 text-[10px] font-medium">Add</span>
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
  icon: typeof CalendarCheck;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex min-h-14 min-w-0 flex-1 basis-0 touch-manipulation flex-col items-center justify-center gap-1 py-2 text-[10px] transition-[color,transform] active:scale-95',
        active ? 'text-foreground font-semibold' : 'text-muted-foreground',
      )}
    >
      {active ? (
        <span className="bg-primary absolute inset-x-4 top-0 h-0.5 rounded-full" aria-hidden />
      ) : null}
      <Icon className={cn('relative size-[19px]', active && 'text-primary')} aria-hidden />
      <span className="relative max-w-full truncate px-1">{label}</span>
    </Link>
  );
}
