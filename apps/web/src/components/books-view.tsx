'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, ChevronDown, ChevronUp, Plus, Star, Trash2 } from 'lucide-react';
import { getDb } from '@drift/core';
import type { Book, BookStatus, Quote } from '@drift/core';
import { createBook, updateBook, deleteBook } from '@/lib/books';
import { cn } from '@drift/ui';

/* ─── Constants ────────────────────────────────────────────────── */

const STATUS_ORDER: BookStatus[] = ['reading', 'want', 'finished', 'abandoned'];

const STATUS_LABELS: Record<BookStatus, string> = {
  want: 'Want to Read',
  reading: 'Reading',
  finished: 'Finished',
  abandoned: 'Abandoned',
};

/* ─── Create Form ──────────────────────────────────────────────── */

interface BookFormProps {
  onSaved: () => void;
  onCancel: () => void;
}

function BookForm({ onSaved, onCancel }: BookFormProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState<BookStatus>('want');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await createBook({
        title: title.trim(),
        ...(author.trim() ? { author: author.trim() } : {}),
        status,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface-flat flex flex-col gap-3 p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
        New Book
      </div>
      <input
        className="input"
        placeholder="Title"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="input"
          placeholder="Author (optional)"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
        <select
          className="input"
          value={status}
          onChange={(e) => setStatus(e.target.value as BookStatus)}
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
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
          disabled={saving || !title.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Add Book'}
        </button>
      </div>
    </form>
  );
}

/* ─── StarRating ────────────────────────────────────────────────── */

function StarRating({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => i + 1).map((star) => {
        const active = hovered !== null ? star <= hovered : star <= (value ?? 0);
        return (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onChange(star === value ? 0 : star)}
            title={`${star} star${star !== 1 ? 's' : ''}`}
            className={cn(
              'transition-colors',
              active ? 'text-warning' : 'text-border-strong hover:text-warning/60',
            )}
          >
            <Star
              className="size-3.5"
              fill={active ? 'currentColor' : 'none'}
              strokeWidth={active ? 0 : 1.5}
            />
          </button>
        );
      })}
    </div>
  );
}

/* ─── BookHighlights ────────────────────────────────────────────── */

function BookHighlights({ bookId, quotes }: { bookId: string; quotes: Quote[] }) {
  const [expanded, setExpanded] = useState(false);
  const bookQuotes = quotes.filter((q) => q.bookId === bookId);

  if (bookQuotes.length === 0) return null;

  return (
    <div className="hairline border-t pt-2.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-left"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
          {bookQuotes.length} highlight{bookQuotes.length !== 1 ? 's' : ''}
        </span>
        {expanded ? (
          <ChevronUp className="size-3 text-subtle-foreground" />
        ) : (
          <ChevronDown className="size-3 text-subtle-foreground" />
        )}
      </button>

      {expanded && (
        <ul className="mt-2 flex flex-col gap-2">
          {bookQuotes.map((q) => (
            <li key={q.id} className="rounded-md bg-bg-sunken px-3 py-2">
              <p className="text-[13px] italic leading-snug text-foreground">&ldquo;{q.text}&rdquo;</p>
              {q.author && (
                <p className="mt-1 font-mono text-[10px] text-subtle-foreground">— {q.author}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── BookCard ──────────────────────────────────────────────────── */

interface BookCardProps {
  book: Book;
  quotes: Quote[];
}

function BookCard({ book, quotes }: BookCardProps) {
  const [confirming, setConfirming] = useState(false);

  async function handleRating(rating: number) {
    await updateBook(book.id, { rating });
  }

  async function handleStatus(status: BookStatus) {
    const patch: Partial<Book> = { status };
    if (status === 'reading' && !book.startedAt) {
      patch.startedAt = new Date().toISOString();
    }
    if (status === 'finished' && !book.finishedAt) {
      patch.finishedAt = new Date().toISOString();
    }
    await updateBook(book.id, patch);
  }

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    await deleteBook(book.id);
  }

  return (
    <li className="surface-flat group relative flex gap-3 px-4 py-3 transition-all hover:border-border-strong hover:shadow-[0_4px_18px_-12px_rgba(0,0,0,0.35)]">
      {/* Cover placeholder */}
      <div
        className="mt-0.5 flex h-16 w-11 shrink-0 flex-col items-center justify-center overflow-hidden rounded-[6px] bg-primary-soft"
        aria-hidden
      >
        {book.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <BookOpen className="size-4 text-primary" />
        )}
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium leading-snug">{book.title}</p>
            {book.author && (
              <p className="mt-0.5 text-[12px] text-muted-foreground">{book.author}</p>
            )}
          </div>

          {/* Delete */}
          <button
            type="button"
            onClick={handleDelete}
            onBlur={() => setConfirming(false)}
            title={confirming ? 'Click again to confirm' : 'Delete book'}
            className={cn(
              'inline-flex size-7 shrink-0 items-center justify-center rounded-md opacity-0 transition-colors group-hover:opacity-100',
              confirming
                ? 'bg-destructive text-destructive-foreground'
                : 'text-muted-foreground hover:text-destructive',
            )}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>

        {/* Rating + status change */}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <StarRating value={book.rating} onChange={handleRating} />
          <select
            className="rounded-md border border-border bg-input px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-foreground focus:outline-none"
            value={book.status}
            onChange={(e) => handleStatus(e.target.value as BookStatus)}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {/* Highlights */}
        <div className="mt-2">
          <BookHighlights bookId={book.id} quotes={quotes} />
        </div>
      </div>
    </li>
  );
}

/* ─── StatusGroup ───────────────────────────────────────────────── */

interface StatusGroupProps {
  status: BookStatus;
  books: Book[];
  quotes: Quote[];
}

function StatusGroup({ status, books, quotes }: StatusGroupProps) {
  if (books.length === 0) return null;

  return (
    <section className="grid gap-2">
      <div className="flex items-center gap-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
          {STATUS_LABELS[status]}
        </div>
        <div className="hairline flex-1 border-t" aria-hidden />
        <div className="font-mono text-[10px] tabular-nums text-subtle-foreground">
          {books.length}
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {books.map((book) => (
          <BookCard key={book.id} book={book} quotes={quotes} />
        ))}
      </ul>
    </section>
  );
}

/* ─── BooksView (main export) ───────────────────────────────────── */

export function BooksView() {
  const [formOpen, setFormOpen] = useState(false);

  const data = useLiveQuery(async () => {
    const db = getDb();
    const [allBooks, allQuotes] = await Promise.all([
      db.books.toArray(),
      db.quotes.toArray(),
    ]);
    const books = allBooks
      .filter((b) => !b.deletedAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const quotes = allQuotes.filter((q) => !q.deletedAt);
    return { books, quotes };
  });

  if (data === undefined) {
    return <BooksSkeleton />;
  }

  const { books, quotes } = data;

  const grouped = STATUS_ORDER.reduce<Record<BookStatus, Book[]>>(
    (acc, status) => {
      acc[status] = books.filter((b) => b.status === status);
      return acc;
    },
    { want: [], reading: [], finished: [], abandoned: [] },
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Add button / form */}
      {formOpen ? (
        <BookForm onSaved={() => setFormOpen(false)} onCancel={() => setFormOpen(false)} />
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
          Add a book to your reading list
        </button>
      )}

      {/* Empty state */}
      {books.length === 0 && !formOpen && (
        <div className="surface flex min-h-52 flex-col items-center justify-center gap-3 p-10 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-subtle-foreground">
            Books
          </div>
          <h3 className="text-xl font-semibold tracking-tight">A clean slate.</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Track what you&apos;re reading, rate finished books, and collect highlights alongside
            each one.
          </p>
        </div>
      )}

      {/* Grouped by status */}
      {books.length > 0 && (
        <div className="flex flex-col gap-6">
          {STATUS_ORDER.map((status) => (
            <StatusGroup
              key={status}
              status={status}
              books={grouped[status]}
              quotes={quotes}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Skeleton ─────────────────────────────────────────────────── */

function BooksSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {['Reading', 'Want to Read'].map((label) => (
        <section key={label} className="grid gap-2">
          <div className="flex items-center gap-3">
            <div className="h-3 w-20 animate-pulse rounded bg-border" />
            <div className="hairline flex-1 border-t" />
          </div>
          <ul className="flex flex-col gap-2">
            {Array.from({ length: label === 'Reading' ? 1 : 2 }).map((_, i) => (
              <li
                key={i}
                aria-hidden
                className="surface-flat h-20 animate-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
