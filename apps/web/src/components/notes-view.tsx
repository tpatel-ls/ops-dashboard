'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Flag, Plus, Trash2, X } from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import type { Note } from '@ops-dashboard/core';
import { createNote, updateNote, deleteNote } from '@/lib/notes';
import { cn } from '@ops-dashboard/ui';

/* ─── Create Form ──────────────────────────────────────────────── */

interface NoteFormProps {
  onSaved: () => void;
  onCancel: () => void;
}

function NoteForm({ onSaved, onCancel }: NoteFormProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [source, setSource] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    try {
      const tags = tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await createNote({
        ...(title.trim() ? { title: title.trim() } : {}),
        body: body.trim(),
        ...(source.trim() ? { source: source.trim() } : {}),
        tags,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface-flat flex flex-col gap-3 p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
        New Note
      </div>
      <input
        className="input"
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="input min-h-[100px] resize-y"
        placeholder="Note body…"
        required
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <input
        className="input"
        placeholder="Source (optional)"
        value={source}
        onChange={(e) => setSource(e.target.value)}
      />
      <input
        className="input"
        placeholder="Tags — comma separated (optional)"
        value={tagsRaw}
        onChange={(e) => setTagsRaw(e.target.value)}
      />
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !body.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Note'}
        </button>
      </div>
    </form>
  );
}

/* ─── NoteCard ─────────────────────────────────────────────────── */

function NoteCard({ note }: { note: Note }) {
  const [confirming, setConfirming] = useState(false);
  const titleOrFirst = note.title ?? note.body.split('\n')[0] ?? '';
  const excerpt =
    note.title
      ? note.body.length > 240
        ? note.body.slice(0, 240) + '…'
        : note.body
      : note.body.length > 240
        ? note.body.slice(0, 240) + '…'
        : note.body;

  async function handleFlag() {
    await updateNote(note.id, { flaggedForReview: !note.flaggedForReview });
  }

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    await deleteNote(note.id);
  }

  return (
    <li className="surface-flat group relative flex flex-col gap-2.5 px-4 py-3 transition-all hover:border-border-strong hover:shadow-[0_4px_18px_-12px_rgba(0,0,0,0.35)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {note.title && (
            <p className="truncate text-[14px] font-medium leading-snug">{note.title}</p>
          )}
          {note.source && (
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle-foreground">
              {note.source}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={handleFlag}
            title={note.flaggedForReview ? 'Unflag for review' : 'Flag for review'}
            className={cn(
              'inline-flex size-7 items-center justify-center rounded-md transition-colors',
              note.flaggedForReview
                ? 'text-warning'
                : 'text-muted-foreground hover:text-warning',
            )}
          >
            <Flag className="size-3.5" fill={note.flaggedForReview ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            onBlur={() => setConfirming(false)}
            title={confirming ? 'Click again to confirm' : 'Delete note'}
            className={cn(
              'inline-flex size-7 items-center justify-center rounded-md transition-colors',
              confirming
                ? 'bg-destructive text-destructive-foreground'
                : 'text-muted-foreground hover:text-destructive',
            )}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Body excerpt */}
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{excerpt}</p>

      {/* Footer: tags + flag indicator */}
      <div className="flex flex-wrap items-center gap-1.5">
        {note.flaggedForReview && (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-warning">
            <Flag className="size-2.5" fill="currentColor" />
            Review
          </span>
        )}
        {note.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground"
          >
            #{tag}
          </span>
        ))}
      </div>
    </li>
  );
}

/* ─── NotesView (main export) ──────────────────────────────────── */

export function NotesView() {
  const [formOpen, setFormOpen] = useState(false);

  const notes = useLiveQuery(async () => {
    const db = getDb();
    const all = await db.notes.toArray();
    return all
      .filter((n) => !n.deletedAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  if (notes === undefined) {
    return <NotesSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Add button / form */}
      {formOpen ? (
        <NoteForm onSaved={() => setFormOpen(false)} onCancel={() => setFormOpen(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className={cn(
            'flex items-center gap-2 rounded-[14px] border border-dashed border-border px-4 py-4 text-sm text-muted-foreground transition-colors',
            'hover:border-primary hover:bg-primary-soft hover:text-primary',
          )}
        >
          <Plus className="size-4" />
          Capture a note — idea, excerpt, or reference
        </button>
      )}

      {/* Empty state */}
      {notes.length === 0 && !formOpen && (
        <div className="surface flex min-h-52 flex-col items-center justify-center gap-3 p-10 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-subtle-foreground">
            Notes
          </div>
          <h3 className="text-xl font-semibold tracking-tight">A clean slate.</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Capture ideas, excerpts, and references. Flag anything worth revisiting later.
          </p>
        </div>
      )}

      {/* Notes list */}
      {notes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Skeleton ─────────────────────────────────────────────────── */

function NotesSkeleton() {
  return (
    <ul className="flex flex-col gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <li
          key={i}
          aria-hidden
          className="surface-flat h-24 animate-pulse"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </ul>
  );
}
