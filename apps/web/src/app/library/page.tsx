'use client';

import { useState } from 'react';
import { BookOpen, PenLine, Plus, X } from 'lucide-react';
import { ViewShell } from '@/components/view-shell';
import { JournalList } from '@/components/journal-list';
import { JournalUpload } from '@/components/journal-upload';
import { cn } from '@drift/ui';

export default function LibraryPage() {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <ViewShell
      eyebrow="Library"
      title="Library"
      subtitle="Notes, journal entries, and reflections — all in one place."
      actions={
        <button
          type="button"
          onClick={() => setAddOpen((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors',
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
      }
    >
      <div className="flex flex-col gap-4">
        {/* Section header */}
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-primary" aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
            Journal
          </span>
        </div>

        {/* Upload / add panel */}
        {addOpen && (
          <div className="rounded-[14px]">
            <JournalUpload
              onSaved={() => setAddOpen(false)}
            />
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
              'flex items-center gap-2 rounded-[14px] border border-dashed border-border px-4 py-4 text-sm text-muted-foreground transition-colors',
              'hover:border-primary hover:bg-primary-soft hover:text-primary',
            )}
          >
            <PenLine className="size-4" />
            Add a journal entry — paste text or upload a photo
          </button>
        )}
      </div>
    </ViewShell>
  );
}
