'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronDown, ChevronUp, MessageSquarePlus, Plus, Star, Trash2 } from 'lucide-react';
import { getDb } from '@drift/core';
import type { Quote, QuoteSourceType, Thought } from '@drift/core';
import { createQuote, updateQuote, deleteQuote, makeThought } from '@/lib/quotes';
import { cn } from '@drift/ui';

/* ─── Constants ────────────────────────────────────────────────── */

const SOURCE_TYPE_LABELS: Record<QuoteSourceType, string> = {
  book: 'Book',
  article: 'Article',
  podcast: 'Podcast',
  conversation: 'Conversation',
  other: 'Other',
};

const SOURCE_TYPES: QuoteSourceType[] = ['book', 'article', 'podcast', 'conversation', 'other'];

/* ─── Create Form ──────────────────────────────────────────────── */

interface QuoteFormProps {
  onSaved: () => void;
  onCancel: () => void;
}

function QuoteForm({ onSaved, onCancel }: QuoteFormProps) {
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('');
  const [source, setSource] = useState('');
  const [sourceType, setSourceType] = useState<QuoteSourceType | ''>('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      const tags = tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await createQuote({
        text: text.trim(),
        ...(author.trim() ? { author: author.trim() } : {}),
        ...(source.trim() ? { source: source.trim() } : {}),
        ...(sourceType ? { sourceType } : {}),
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
        New Quote
      </div>
      <textarea
        className="input min-h-[90px] resize-y"
        placeholder="Quote text…"
        required
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="input"
          placeholder="Author (optional)"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
        <input
          className="input"
          placeholder="Source title (optional)"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          className="input"
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value as QuoteSourceType | '')}
        >
          <option value="">Source type (optional)</option>
          {SOURCE_TYPES.map((st) => (
            <option key={st} value={st}>
              {SOURCE_TYPE_LABELS[st]}
            </option>
          ))}
        </select>
        <input
          className="input"
          placeholder="Tags — comma separated (optional)"
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
        />
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
          disabled={saving || !text.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Quote'}
        </button>
      </div>
    </form>
  );
}

/* ─── AddThoughtInput ──────────────────────────────────────────── */

interface AddThoughtInputProps {
  quote: Quote;
  onDone: () => void;
}

function AddThoughtInput({ quote, onDone }: AddThoughtInputProps) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      const newThought = makeThought(text.trim());
      await updateQuote(quote.id, { thoughts: [...quote.thoughts, newThought] });
      setText('');
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1">
      <input
        autoFocus
        className="input flex-1"
        placeholder="Add a thought…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onDone();
        }}
      />
      <button
        type="submit"
        disabled={saving || !text.trim()}
        className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? '…' : 'Add'}
      </button>
      <button
        type="button"
        onClick={onDone}
        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
      >
        ×
      </button>
    </form>
  );
}

/* ─── QuoteCard ────────────────────────────────────────────────── */

function QuoteCard({ quote }: { quote: Quote }) {
  const [thoughtsExpanded, setThoughtsExpanded] = useState(false);
  const [addingThought, setAddingThought] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleFavorite() {
    await updateQuote(quote.id, { favorite: !quote.favorite });
  }

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    await deleteQuote(quote.id);
  }

  async function handleDeleteThought(thoughtId: string) {
    const remaining = quote.thoughts.filter((t) => t.id !== thoughtId);
    await updateQuote(quote.id, { thoughts: remaining });
  }

  const hasThoughts = quote.thoughts.length > 0;

  return (
    <li className="surface-flat group relative flex flex-col gap-2.5 px-4 py-3 transition-all hover:border-border-strong hover:shadow-[0_4px_18px_-12px_rgba(0,0,0,0.35)]">
      {/* Quote text */}
      <blockquote className="text-sm leading-relaxed text-foreground">
        &ldquo;{quote.text}&rdquo;
      </blockquote>

      {/* Attribution row */}
      <div className="flex flex-wrap items-center gap-2">
        {(quote.author || quote.source) && (
          <span className="font-mono text-[11px] text-muted-foreground">
            {quote.author ? `— ${quote.author}` : ''}
            {quote.author && quote.source ? ', ' : ''}
            {quote.source && (
              <span className="italic">{quote.source}</span>
            )}
          </span>
        )}
        {quote.sourceType && (
          <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-accent-foreground">
            {SOURCE_TYPE_LABELS[quote.sourceType]}
          </span>
        )}
        {quote.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground"
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* Thoughts section */}
      {(hasThoughts || addingThought || thoughtsExpanded) && (
        <div className="hairline border-t pt-2.5">
          {hasThoughts && (
            <button
              type="button"
              onClick={() => setThoughtsExpanded((v) => !v)}
              className="flex items-center gap-1.5 text-left"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
                Thoughts ({quote.thoughts.length})
              </span>
              {thoughtsExpanded ? (
                <ChevronUp className="size-3 text-subtle-foreground" />
              ) : (
                <ChevronDown className="size-3 text-subtle-foreground" />
              )}
            </button>
          )}

          {thoughtsExpanded && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {quote.thoughts.map((thought) => (
                <li
                  key={thought.id}
                  className="group/thought flex items-start justify-between gap-2"
                >
                  <p className="flex-1 text-[13px] leading-snug text-muted-foreground">
                    {thought.text}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDeleteThought(thought.id)}
                    className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded text-subtle-foreground opacity-0 transition-colors group-hover/thought:opacity-100 hover:text-destructive"
                    title="Remove thought"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {addingThought && (
            <AddThoughtInput
              quote={quote}
              onDone={() => {
                setAddingThought(false);
                setThoughtsExpanded(true);
              }}
            />
          )}
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setAddingThought((v) => !v);
            if (!thoughtsExpanded && !addingThought) setThoughtsExpanded(true);
          }}
          className="inline-flex items-center gap-1.5 text-[12px] text-subtle-foreground transition-colors hover:text-primary"
        >
          <MessageSquarePlus className="size-3.5" />
          {hasThoughts && !thoughtsExpanded ? 'See thoughts' : 'Add thought'}
        </button>

        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={handleFavorite}
            title={quote.favorite ? 'Unfavorite' : 'Favorite'}
            className={cn(
              'inline-flex size-7 items-center justify-center rounded-md transition-colors',
              quote.favorite
                ? 'text-warning'
                : 'text-muted-foreground hover:text-warning',
            )}
          >
            <Star
              className="size-3.5"
              fill={quote.favorite ? 'currentColor' : 'none'}
            />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            onBlur={() => setConfirming(false)}
            title={confirming ? 'Click again to confirm' : 'Delete quote'}
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
    </li>
  );
}

/* ─── QuotesView (main export) ─────────────────────────────────── */

export function QuotesView() {
  const [formOpen, setFormOpen] = useState(false);

  const quotes = useLiveQuery(async () => {
    const db = getDb();
    const all = await db.quotes.toArray();
    return all
      .filter((q) => !q.deletedAt)
      .sort((a, b) => {
        // Favorites first, then newest
        if (a.favorite && !b.favorite) return -1;
        if (!a.favorite && b.favorite) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  });

  if (quotes === undefined) {
    return <QuotesSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Add button / form */}
      {formOpen ? (
        <QuoteForm onSaved={() => setFormOpen(false)} onCancel={() => setFormOpen(false)} />
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
          Save a quote — from books, articles, podcasts, or conversations
        </button>
      )}

      {/* Empty state */}
      {quotes.length === 0 && !formOpen && (
        <div className="surface flex min-h-52 flex-col items-center justify-center gap-3 p-10 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-subtle-foreground">
            Quotes
          </div>
          <h3 className="text-xl font-semibold tracking-tight">A clean slate.</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Collect the words that move you. Star favorites and attach your own thoughts to any
            quote.
          </p>
        </div>
      )}

      {/* Quotes list */}
      {quotes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {quotes.map((quote) => (
            <QuoteCard key={quote.id} quote={quote} />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Skeleton ─────────────────────────────────────────────────── */

function QuotesSkeleton() {
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
