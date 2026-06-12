'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getDb } from '@ops-dashboard/core';

export function ResurfacingEntry() {
  const entry = useLiveQuery(async () => {
    const all = await getDb().journalEntries.toArray();
    const active = all.filter((e) => !e.deletedAt);
    if (active.length === 0) return null;
    return active.sort((a, b) => b.date.localeCompare(a.date))[0];
  });

  // undefined = loading, null = none
  if (entry === undefined) return null;
  if (entry === null) return null;

  const snippet =
    entry.body.length > 160 ? `${entry.body.slice(0, 160).trim()}…` : entry.body;

  return (
    <section className="surface-flat relative overflow-hidden">
      {/* subtle left accent stripe */}
      <span className="absolute inset-y-0 left-0 w-[3px] rounded-r-full bg-primary/40" aria-hidden />

      <div className="hairline flex items-center gap-1.5 border-b px-4 py-2.5 pl-5">
        <BookOpen className="size-3.5 text-primary" aria-hidden />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
          Resurfacing
        </span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          {format(parseISO(`${entry.date}T00:00:00`), 'MMM d, yyyy')}
        </span>
      </div>

      <div className="px-5 py-3">
        {entry.title && (
          <p className="mb-1 text-[12px] font-semibold text-foreground">{entry.title}</p>
        )}
        <p className="text-[13px] leading-relaxed text-muted-foreground italic">&ldquo;{snippet}&rdquo;</p>
        {entry.mood && (
          <p className="mt-2 font-mono text-[10px] text-subtle-foreground">
            Mood: {entry.mood}
          </p>
        )}
      </div>
    </section>
  );
}
