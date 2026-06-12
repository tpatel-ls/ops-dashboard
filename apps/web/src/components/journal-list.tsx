'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { format, parseISO } from 'date-fns';
import { BookOpen, Trash2, Upload } from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import type { JournalEntry } from '@ops-dashboard/core';
import { deleteJournalEntry } from '@/lib/journal';
import { cn } from '@ops-dashboard/ui';

const MOOD_GLYPH: Record<string, { symbol: string; label: string; color: string }> = {
  great: { symbol: '✦', label: 'Great', color: 'text-success' },
  good: { symbol: '◆', label: 'Good', color: 'text-primary' },
  neutral: { symbol: '◇', label: 'Neutral', color: 'text-muted-foreground' },
  low: { symbol: '▽', label: 'Low', color: 'text-warning' },
  rough: { symbol: '△', label: 'Rough', color: 'text-destructive' },
};

export function JournalList() {
  const entries = useLiveQuery(async () => {
    const db = getDb();
    const all = await db.journalEntries.toArray();
    return all
      .filter((e) => !e.deletedAt)
      .sort((a, b) => {
        // sort by date desc, then by createdAt desc within same date
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  });

  if (entries === undefined) {
    return <JournalSkeleton />;
  }

  if (entries.length === 0) {
    return (
      <div className="surface flex h-64 flex-col items-center justify-center gap-2 p-10 text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-subtle-foreground">
          journal
        </div>
        <h3 className="text-xl font-semibold tracking-tight">A clean slate.</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Upload a photo, paste some text, or type a quick note. AI will extract a clean entry and
          detect completed habits.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => (
        <JournalCard key={entry.id} entry={entry} />
      ))}
    </ul>
  );
}

function JournalCard({ entry }: { entry: JournalEntry }) {
  const mood = entry.mood ? MOOD_GLYPH[entry.mood] : null;
  const excerpt = entry.body.length > 280 ? entry.body.slice(0, 280) + '…' : entry.body;

  const formattedDate = (() => {
    try {
      return format(parseISO(`${entry.date}T00:00:00`), 'EEEE, d MMM yyyy');
    } catch {
      return entry.date;
    }
  })();

  return (
    <li className="surface-flat group relative flex flex-col gap-3 px-4 py-3 transition-all hover:border-border-strong hover:shadow-[0_4px_18px_-12px_rgba(0,0,0,0.35)]">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <time
              dateTime={entry.date}
              className="font-mono text-[11px] text-subtle-foreground"
            >
              {formattedDate}
            </time>
            {mood && (
              <span
                className={cn(
                  'font-mono text-[10px] uppercase tracking-[0.14em]',
                  mood.color,
                )}
                title={mood.label}
              >
                {mood.symbol} {mood.label}
              </span>
            )}
            {entry.source === 'upload' && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-accent px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-accent-foreground">
                <Upload className="size-2.5" aria-hidden />
                upload
              </span>
            )}
          </div>
          {entry.title && (
            <p className="mt-0.5 text-[14px] font-medium leading-snug">{entry.title}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => deleteJournalEntry(entry.id)}
          className={cn(
            'inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors',
            'opacity-0 group-hover:opacity-100 hover:text-destructive',
          )}
          aria-label="Delete entry"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {/* Body excerpt */}
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{excerpt}</p>

      {/* Tags */}
      {entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}

function JournalSkeleton() {
  return (
    <ul className="flex flex-col gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <li
          key={i}
          aria-hidden
          className="surface-flat h-28 animate-pulse"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </ul>
  );
}

// Re-export an icon for use in the page
export { BookOpen };
