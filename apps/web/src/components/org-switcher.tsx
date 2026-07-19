'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, ChevronDown, Layers } from 'lucide-react';
import { getDb, PERSONAL_COLOR } from '@ops-dashboard/core';
import type { OrgContext, Organization } from '@ops-dashboard/core';
import { cn } from '@ops-dashboard/ui';
import { useOrgStore } from '@/lib/org-store';

const emptySubscribe = () => () => {};

/** SSR renders a neutral shell; the persisted context only shows post-hydration. */
function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

interface Lane {
  ctx: OrgContext;
  label: string;
  color: string;
}

export function useActiveOrgs(): Organization[] | undefined {
  return useLiveQuery(async () => {
    const all = await getDb().organizations.toArray();
    return all
      .filter((o) => !o.deletedAt && !o.archivedAt)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  });
}

export function OrgSwitcher() {
  const mounted = useMounted();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const ctx = useOrgStore((s) => s.ctx);
  const setCtx = useOrgStore((s) => s.setCtx);
  const orgs = useActiveOrgs();

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.requestAnimationFrame(() => {
      const activeItem = rootRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]');
      (activeItem ?? itemRefs.current[0])?.focus();
    });

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const lanes: Lane[] = [
    { ctx: 'all', label: 'All work', color: 'var(--primary)' },
    ...(orgs ?? []).map((o) => ({ ctx: o.id as OrgContext, label: o.name, color: o.color })),
    { ctx: 'personal', label: 'Personal', color: PERSONAL_COLOR },
  ];
  const current = lanes.find((l) => l.ctx === ctx) ?? lanes[0]!;

  function moveMenuFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = itemRefs.current.filter((item): item is HTMLButtonElement => Boolean(item));
    if (items.length === 0) return;
    event.preventDefault();
    const currentIndex = Math.max(items.indexOf(document.activeElement as HTMLButtonElement), 0);
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowDown'
            ? (currentIndex + 1) % items.length
            : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={mounted ? `Switch context, current ${current.label}` : 'Switch context'}
        title={mounted ? `Current workspace: ${current.label}` : 'Switch context'}
        className="hairline inline-flex h-10 max-w-28 items-center gap-2 rounded-lg border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent sm:max-w-40 lg:h-9"
      >
        {mounted ? (
          <>
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ background: current.color }}
            />
            <span className="max-w-16 truncate sm:max-w-28">{current.label}</span>
          </>
        ) : (
          <Layers className="size-3.5 text-muted-foreground" aria-hidden />
        )}
        <ChevronDown className="size-3 text-subtle-foreground" aria-hidden />
      </button>

      {open ? (
        <div
          role="menu"
          onKeyDown={moveMenuFocus}
          className="surface absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden py-1"
        >
          <div className="hairline border-b px-3 pb-2 pt-2 text-[10px] font-semibold uppercase text-subtle-foreground">
            Filter work by
          </div>
          {lanes.map((lane, index) => {
            const active = lane.ctx === ctx;
            return (
              <button
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                key={lane.ctx}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setCtx(lane.ctx);
                  setOpen(false);
                }}
                className={cn(
                  'mx-1 flex min-h-10 w-[calc(100%_-_0.5rem)] items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                  active
                    ? 'bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                )}
              >
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]"
                  style={{ background: lane.color }}
                />
                <span className="min-w-0 flex-1 truncate">{lane.label}</span>
                {active ? (
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                    Current
                    <Check className="size-3.5" aria-hidden />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
