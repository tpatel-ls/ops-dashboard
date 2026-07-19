'use client';

import { useState } from 'react';
import { BookOpen, BookText, MessageSquareQuote, NotebookPen, PenLine, Plus, X } from 'lucide-react';
import { ViewShell } from '@/components/view-shell';
import { JournalList } from '@/components/journal-list';
import { JournalUpload } from '@/components/journal-upload';
import { NotesView } from '@/components/notes-view';
import { QuotesView } from '@/components/quotes-view';
import { BooksView } from '@/components/books-view';
import { cn } from '@ops-dashboard/ui';

/* ─── Tab definition ───────────────────────────────────────────── */

type Tab = 'journal' | 'notes' | 'quotes' | 'books';

interface TabDef {
  id: Tab;
  label: string;
  icon: React.ElementType;
}

const TABS: TabDef[] = [
  { id: 'journal', label: 'Journal', icon: PenLine },
  { id: 'notes', label: 'Notes', icon: NotebookPen },
  { id: 'quotes', label: 'Quotes', icon: MessageSquareQuote },
  { id: 'books', label: 'Books', icon: BookText },
];

/* ─── LibraryPage ──────────────────────────────────────────────── */

export default function LibraryPage() {
  const [tab, setTab] = useState<Tab>('journal');
  const [addOpen, setAddOpen] = useState(false);

  // Reset add panel when switching away from journal
  function handleTabChange(next: Tab) {
    setTab(next);
    if (next !== 'journal') setAddOpen(false);
  }

  return (
    <ViewShell
      eyebrow="Library"
      title="Library"
      subtitle="Keep reference material organized and searchable."
      compactHeader
      fullWidth
      actions={
        tab === 'journal' ? (
          <button
            type="button"
            onClick={() => setAddOpen((v) => !v)}
            className={cn(
              'inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors',
              addOpen
                ? 'bg-accent text-accent-foreground'
                : 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {addOpen ? (
              <>
                <X className="size-3.5" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="size-3.5" />
                New entry
              </>
            )}
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        {/* ── Tab bar ── */}
        <nav
          className="grid grid-cols-4 gap-1 rounded-lg bg-bg-sunken p-1"
          aria-label="Library sections"
          role="tablist"
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => handleTabChange(id)}
              className={cn(
                'inline-flex h-10 min-w-0 items-center justify-center gap-1 rounded-md px-1 text-xs font-medium transition-colors sm:gap-1.5 sm:px-3 sm:text-sm',
                tab === id
                  ? 'bg-card text-foreground shadow-[0_1px_3px_0_rgba(0,0,0,0.12)]'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              aria-current={tab === id ? 'page' : undefined}
            >
              <Icon className="size-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 truncate">{label}</span>
            </button>
          ))}
        </nav>

        {/* ── Journal tab ── */}
        {tab === 'journal' && (
          <>
            {/* Section header */}
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-primary" aria-hidden />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
                Journal
              </span>
            </div>

            {/* Upload / add panel */}
            {addOpen && (
              <div className="rounded-lg">
                <JournalUpload onSaved={() => setAddOpen(false)} />
              </div>
            )}

            {/* Entry list */}
            <JournalList />

            {/* Bottom CTA when list is visible and add panel is closed */}
            {!addOpen && (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className={cn(
                  'flex min-h-12 items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors',
                  'hover:border-primary hover:bg-primary-soft hover:text-primary',
                )}
              >
                <PenLine className="size-4" />
                Add journal entry
              </button>
            )}
          </>
        )}

        {/* ── Notes tab ── */}
        {tab === 'notes' && <NotesView />}

        {/* ── Quotes tab ── */}
        {tab === 'quotes' && <QuotesView />}

        {/* ── Books tab ── */}
        {tab === 'books' && <BooksView />}
      </div>
    </ViewShell>
  );
}
