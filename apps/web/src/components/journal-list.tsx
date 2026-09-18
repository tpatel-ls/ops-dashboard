'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, Trash2, Upload } from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import type { JournalEntry } from '@ops-dashboard/core';
import { compareJournalEntries, deleteJournalEntry, journalDateLabel } from '@/lib/journal';
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
    return all.filter((e) => !e.deletedAt).sort(compareJournalEntries);
  });

  if (entries === undefined) {
    return <JournalSkeleton />;
  }

  if (entries.length === 0) {
    return (
      <div className="surface flex h-64 flex-col items-center justify-center gap-2 p-10 text-center">
        <div className="text-subtle-foreground font-mono text-[10px] tracking-[0.22em] uppercase">
          journal
        </div>
        <h3 className="text-xl font-semibold tracking-tight">A clean slate.</h3>
        <p className="text-muted-foreground max-w-sm text-sm">
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

  const formattedDate = journalDateLabel(entry.date, 'EEEE, d MMM yyyy');

  return (
    <li className="surface-flat group hover:border-border-strong relative flex flex-col gap-3 px-4 py-3 transition-all hover:shadow-[0_4px_18px_-12px_rgba(0,0,0,0.35)]">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <time dateTime={entry.date} className="text-subtle-foreground font-mono text-[11px]">
              {formattedDate}
            </time>
            {mood && (
              <span
                className={cn('font-mono text-[10px] tracking-[0.14em] uppercase', mood.color)}
                title={mood.label}
              >
                {mood.symbol} {mood.label}
              </span>
            )}
            {entry.source === 'upload' && (
              <span className="bg-accent text-accent-foreground inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[9px] tracking-[0.14em] uppercase">
                <Upload className="size-2.5" aria-hidden />
                upload
              </span>
            )}
          </div>
          {entry.title && (
            <p className="mt-0.5 text-[14px] leading-snug font-medium">{entry.title}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => deleteJournalEntry(entry.id)}
          className={cn(
            'text-muted-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors',
            'hover:text-destructive opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100',
          )}
          aria-label="Delete entry"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {/* Body excerpt */}
      <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{excerpt}</p>

      {/* Tags */}
      {entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-[10px]"
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
