'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, ListTodo, Plus, Repeat, Sun } from 'lucide-react';
import { cn } from '@ops-dashboard/ui';
import { useAppStore } from '@/lib/app-store';

const LEFT = [
  { href: '/today', label: 'Today', icon: Sun },
  { href: '/tasks', label: 'Tasks', icon: ListTodo },
];
const RIGHT = [
  { href: '/routines', label: 'Routines', icon: Repeat },
  { href: '/habits', label: 'Habits', icon: Flame },
];

export function MobileNav() {
  const pathname = usePathname();
  const openQuickAdd = useAppStore((s) => s.openQuickAdd);

  return (
    <nav
      aria-label="Primary"
      className="hairline fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t bg-bg-rail/90 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      {LEFT.map((it) => (
        <Tab key={it.href} {...it} active={pathname.startsWith(it.href)} />
      ))}
      <button
        type="button"
        onClick={openQuickAdd}
        aria-label="Capture"
        className="relative -top-3 mx-1 flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--primary)_70%,transparent)]"
      >
        <Plus className="size-5" />
      </button>
      {RIGHT.map((it) => (
        <Tab key={it.href} {...it} active={pathname.startsWith(it.href)} />
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
  icon: typeof Sun;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      <Icon className="size-5" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
