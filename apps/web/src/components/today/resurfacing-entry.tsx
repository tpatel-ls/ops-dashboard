'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen } from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import { journalDateLabel } from '@/lib/journal';

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

  const snippet = entry.body.length > 160 ? `${entry.body.slice(0, 160).trim()}…` : entry.body;

  return (
    <section className="surface-flat relative overflow-hidden">
      {/* subtle left accent stripe */}
      <span
        className="bg-primary/40 absolute inset-y-0 left-0 w-[3px] rounded-r-full"
        aria-hidden
      />

      <div className="hairline flex items-center gap-1.5 border-b px-4 py-2.5 pl-5">
        <BookOpen className="text-primary size-3.5" aria-hidden />
        <span className="text-subtle-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
          Resurfacing
        </span>
        <span className="text-muted-foreground ml-auto font-mono text-[10px]">
          {journalDateLabel(entry.date, 'MMM d, yyyy')}
        </span>
      </div>

      <div className="px-5 py-3">
        {entry.title && (
          <p className="text-foreground mb-1 text-[12px] font-semibold">{entry.title}</p>
        )}
        <p className="text-muted-foreground text-[13px] leading-relaxed italic">
          &ldquo;{snippet}&rdquo;
        </p>
        {entry.mood && (
          <p className="text-subtle-foreground mt-2 font-mono text-[10px]">Mood: {entry.mood}</p>
        )}
      </div>
    </section>
  );
}
