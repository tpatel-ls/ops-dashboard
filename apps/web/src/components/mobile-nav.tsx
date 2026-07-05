'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, LayoutDashboard, Plus, Repeat, Sun } from 'lucide-react';
import { cn } from '@ops-dashboard/ui';
import { useAppStore } from '@/lib/app-store';

const LEFT = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/today', label: 'Brief', icon: Sun },
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
      className="hairline fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t bg-bg-rail/90 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-18px_42px_-34px_rgba(0,0,0,0.75)] backdrop-blur-xl md:hidden"
    >
      {LEFT.map((it) => (
        <Tab key={it.href} {...it} active={pathname.startsWith(it.href)} />
      ))}
      <div className="relative -top-4 mx-1 flex shrink-0 flex-col items-center">
        <button
          type="button"
          onClick={openQuickAdd}
          aria-label="Capture"
          className="flex size-14 items-center justify-center rounded-full border border-primary/25 bg-primary text-primary-foreground shadow-[0_14px_34px_-14px_color-mix(in_oklch,var(--primary)_82%,transparent)] transition-transform active:scale-95"
        >
          <Plus className="size-5" />
        </button>
        <span className="mt-1 rounded-full border bg-card px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-primary shadow-sm">
          Capture
        </span>
      </div>
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
        'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors',
        active ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      {active ? (
        <span className="absolute inset-x-3 top-1 bottom-1 rounded-[14px] bg-accent shadow-[inset_0_1px_0_0_color-mix(in_oklch,var(--foreground)_7%,transparent)]" aria-hidden />
      ) : null}
      <Icon className={cn('relative size-5', active && 'text-primary')} aria-hidden />
      <span className="relative">{label}</span>
      {active ? (
        <span className="relative mt-0.5 size-1 rounded-full bg-primary" aria-hidden />
      ) : null}
    </Link>
  );
}
