'use client';

import { useId, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Video,
  FileText,
  Mic,
  Mail,
  ExternalLink,
  Plus,
  Trash2,
  X,
  ChevronDown,
} from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import type { Content, ContentType, ContentStatus, Domain } from '@ops-dashboard/core';
import { compareContentOrder, createContent, updateContent, deleteContent } from '@/lib/content';
import { cn } from '@ops-dashboard/ui';

// ── constants ────────────────────────────────────────────────────────────────

const STATUSES: { key: ContentStatus; label: string }[] = [
  { key: 'idea', label: 'Idea' },
  { key: 'outline', label: 'Outline' },
  { key: 'draft', label: 'Draft' },
  { key: 'editing', label: 'Editing' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'published', label: 'Published' },
  { key: 'done', label: 'Done' },
];

const STATUS_DOT: Record<ContentStatus, string> = {
  idea: 'bg-subtle-foreground/40',
  outline: 'bg-primary',
  draft: 'bg-warning',
  editing: 'bg-priority-high',
  waiting: 'bg-muted-foreground/60',
  published: 'bg-success',
  done: 'bg-success/60',
};

const CONTENT_TYPES: {
  key: ContentType;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'video', label: 'Video', Icon: Video },
  { key: 'article', label: 'Article', Icon: FileText },
  { key: 'podcast', label: 'Podcast', Icon: Mic },
  { key: 'newsletter', label: 'Newsletter', Icon: Mail },
];

const TYPE_MAP = Object.fromEntries(CONTENT_TYPES.map((t) => [t.key, t])) as Record<
  ContentType,
  (typeof CONTENT_TYPES)[0]
>;

// ── helpers ──────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: ContentType }) {
  const meta = TYPE_MAP[type];
  const Icon = meta.Icon;
  return (
    <span className="bg-bg-sunken text-subtle-foreground inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] uppercase">
      <Icon className="size-3 shrink-0" aria-hidden />
      {meta.label}
    </span>
  );
}

function DomainChip({ domain }: { domain: Domain }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] text-white/90"
      style={{ background: domain.color ?? 'var(--color-muted-foreground)' }}
    >
      {domain.name}
    </span>
  );
}

// ── inline editor ─────────────────────────────────────────────────────────────

interface EditorProps {
  item: Content;
  domains: Domain[];
  onClose: () => void;
}

function ContentEditor({ item, domains, onClose }: EditorProps) {
  const fieldId = useId();
  const [title, setTitle] = useState(item.title);
  const [type, setType] = useState<ContentType>(item.type);
  const [status, setStatus] = useState<ContentStatus>(item.status);
  const [channel, setChannel] = useState(item.channel ?? '');
  const [url, setUrl] = useState(item.url ?? '');
  const [publishDate, setPublishDate] = useState(item.publishDate ?? '');
  const [domainId, setDomainId] = useState(item.domainId ?? '');
  const [outline, setOutline] = useState(item.outline ?? '');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateContent(item.id, {
        title: title.trim() || item.title,
        type,
        status,
        channel: channel.trim() || undefined,
        url: url.trim() || undefined,
        publishDate: publishDate || undefined,
        domainId: domainId || undefined,
        outline: outline.trim() || undefined,
      });
      onClose();
    } catch {
      setError('Could not save this item. Your edits are still here.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    await deleteContent(item.id);
    onClose();
  }

  return (
    <div className="surface flex flex-col gap-4 p-4" onClick={(e) => e.stopPropagation()}>
      {/* header */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-subtle-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
          Edit item
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-subtle-foreground hover:bg-accent hover:text-foreground inline-flex size-9 items-center justify-center rounded-md"
          aria-label="Close editor"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* title */}
      <label htmlFor={`${fieldId}-title`} className="sr-only">
        Content title
      </label>
      <input
        id={`${fieldId}-title`}
        className="input text-sm font-medium"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        aria-label="Content title"
      />

      {/* row: type + status */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${fieldId}-type`}
            className="text-subtle-foreground font-mono text-[10px] tracking-[0.14em] uppercase"
          >
            Type
          </label>
          <select
            id={`${fieldId}-type`}
            className="input text-xs"
            value={type}
            onChange={(e) => setType(e.target.value as ContentType)}
          >
            {CONTENT_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${fieldId}-status`}
            className="text-subtle-foreground font-mono text-[10px] tracking-[0.14em] uppercase"
          >
            Status
          </label>
          <select
            id={`${fieldId}-status`}
            className="input text-xs"
            value={status}
            onChange={(e) => setStatus(e.target.value as ContentStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* row: channel + domain */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${fieldId}-channel`}
            className="text-subtle-foreground font-mono text-[10px] tracking-[0.14em] uppercase"
          >
            Channel
          </label>
          <input
            id={`${fieldId}-channel`}
            className="input text-xs"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="YouTube, Blog…"
            aria-label="Content channel"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${fieldId}-domain`}
            className="text-subtle-foreground font-mono text-[10px] tracking-[0.14em] uppercase"
          >
            Domain
          </label>
          <select
            id={`${fieldId}-domain`}
            className="input text-xs"
            value={domainId}
            onChange={(e) => setDomainId(e.target.value)}
          >
            <option value="">None</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* url */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor={`${fieldId}-url`}
          className="text-subtle-foreground font-mono text-[10px] tracking-[0.14em] uppercase"
        >
          URL
        </label>
        <input
          id={`${fieldId}-url`}
          className="input text-xs"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          aria-label="Content URL"
        />
      </div>

      {/* publish date */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor={`${fieldId}-publish-date`}
          className="text-subtle-foreground font-mono text-[10px] tracking-[0.14em] uppercase"
        >
          Publish date
        </label>
        <input
          id={`${fieldId}-publish-date`}
          className="input text-xs"
          type="date"
          aria-label="Content publish date"
          value={publishDate}
          onChange={(e) => setPublishDate(e.target.value)}
        />
      </div>

      {/* outline */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor={`${fieldId}-outline`}
          className="text-subtle-foreground font-mono text-[10px] tracking-[0.14em] uppercase"
        >
          Outline (markdown)
        </label>
        <textarea
          id={`${fieldId}-outline`}
          className="input resize-none font-mono text-xs leading-relaxed"
          rows={6}
          value={outline}
          onChange={(e) => setOutline(e.target.value)}
          placeholder="## Intro&#10;- point one&#10;- point two"
          aria-label="Content outline"
        />
      </div>

      {/* actions */}
      {error ? (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleDelete}
          className={cn(
            'inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors',
            confirming
              ? 'bg-destructive text-destructive-foreground'
              : 'text-destructive hover:bg-destructive/10',
          )}
        >
          <Trash2 className="size-3.5" aria-hidden />
          {confirming ? 'Confirm delete' : 'Delete'}
        </button>
        <div className="flex items-center gap-2">
          {confirming && (
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-muted-foreground hover:bg-accent hover:text-foreground h-10 rounded-md px-3 text-xs"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="bg-primary text-primary-foreground h-10 rounded-md px-3 text-xs font-medium disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  item: Content;
  domain?: Domain;
  isOpen: boolean;
  onToggle: () => void;
  domains: Domain[];
}

function ContentCard({ item, domain, isOpen, onToggle, domains }: CardProps) {
  return (
    <div className="flex flex-col">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        className={cn(
          'surface-flat cursor-pointer px-3 py-3 transition-all',
          'hover:border-border-strong hover:shadow-[0_4px_18px_-12px_rgba(0,0,0,0.35)]',
          isOpen && 'border-border-strong rounded-b-none',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 min-w-0 flex-1 text-sm leading-snug font-medium">
            {item.title}
          </p>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-subtle-foreground hover:bg-accent hover:text-primary inline-flex size-8 shrink-0 items-center justify-center rounded-md"
              aria-label="Open link"
            >
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <TypeBadge type={item.type} />
          {domain && <DomainChip domain={domain} />}
        </div>

        {(item.channel || item.publishDate) && (
          <div className="text-subtle-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[10px]">
            {item.channel && <span>{item.channel}</span>}
            {item.publishDate && (
              <span>
                {new Date(item.publishDate + 'T00:00:00').toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>
        )}
      </div>

      {isOpen && <ContentEditor item={item} domains={domains} onClose={onToggle} />}
    </div>
  );
}

// ── quick add ─────────────────────────────────────────────────────────────────

interface QuickAddProps {
  onAdd: (title: string, type: ContentType) => Promise<void>;
}

function QuickAdd({ onAdd }: QuickAddProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ContentType>('article');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = title.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    try {
      await onAdd(text, type);
      setTitle('');
    } catch {
      setError('Could not add this item. Your title is still here.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="surface flex flex-wrap items-center gap-2 px-3 py-2">
      <Plus className="text-primary size-4 shrink-0" aria-hidden />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New content idea"
        aria-label="Content title"
        className="placeholder:text-subtle-foreground min-w-[12rem] flex-1 bg-transparent text-sm outline-none"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as ContentType)}
        aria-label="Content type"
        className="bg-bg-sunken text-muted-foreground h-10 rounded-md px-2 font-mono text-[11px] outline-none"
      >
        {CONTENT_TYPES.map((t) => (
          <option key={t.key} value={t.key}>
            {t.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={busy || !title.trim()}
        className="bg-primary text-primary-foreground h-10 rounded-md px-3 text-xs font-medium disabled:opacity-50"
      >
        Add
      </button>
      {error ? (
        <p role="alert" className="text-destructive basis-full text-xs">
          {error}
        </p>
      ) : null}
    </form>
  );
}

// ── column ────────────────────────────────────────────────────────────────────

interface ColumnProps {
  status: ContentStatus;
  label: string;
  items: Content[];
  domains: Domain[];
  openId: string | null;
  onToggle: (id: string) => void;
}

function Column({ status, label, items, domains, openId, onToggle }: ColumnProps) {
  const domainMap = Object.fromEntries(domains.map((d) => [d.id, d]));
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {/* column header */}
      <div className="flex items-center gap-2 px-0.5">
        <span className={cn('size-2 shrink-0 rounded-full', STATUS_DOT[status])} />
        <span className="text-subtle-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
          {label}
        </span>
        <span className="text-subtle-foreground ml-auto font-mono text-[10px] tabular-nums">
          {items.length}
        </span>
      </div>

      {/* cards */}
      <div className="flex flex-col gap-1.5">
        {items.length === 0 ? (
          <div className="surface-flat text-subtle-foreground flex h-20 items-center justify-center rounded-md text-[11px]">
            Empty
          </div>
        ) : (
          items.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              domain={item.domainId ? domainMap[item.domainId] : undefined}
              isOpen={openId === item.id}
              onToggle={() => onToggle(item.id)}
              domains={domains}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── list group (mobile) ───────────────────────────────────────────────────────

interface ListGroupProps {
  status: ContentStatus;
  label: string;
  items: Content[];
  domains: Domain[];
  openId: string | null;
  onToggle: (id: string) => void;
  defaultOpen?: boolean;
}

function ListGroup({
  status,
  label,
  items,
  domains,
  openId,
  onToggle,
  defaultOpen = true,
}: ListGroupProps) {
  const [collapsed, setCollapsed] = useState(!defaultOpen);
  const domainMap = Object.fromEntries(domains.map((d) => [d.id, d]));

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2 py-1 text-left"
      >
        <span className={cn('size-2 shrink-0 rounded-full', STATUS_DOT[status])} />
        <span className="text-subtle-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
          {label}
        </span>
        <span className="text-subtle-foreground font-mono text-[10px] tabular-nums">
          {items.length}
        </span>
        <ChevronDown
          className={cn(
            'text-subtle-foreground ml-auto size-3.5 transition-transform',
            collapsed && '-rotate-90',
          )}
          aria-hidden
        />
      </button>
      {!collapsed && (
        <div className="flex flex-col gap-1.5">
          {items.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              domain={item.domainId ? domainMap[item.domainId] : undefined}
              isOpen={openId === item.id}
              onToggle={() => onToggle(item.id)}
              domains={domains}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="surface flex h-64 flex-col items-center justify-center gap-2 text-center">
      <div className="text-subtle-foreground font-mono text-[10px] tracking-[0.22em] uppercase">
        content
      </div>
      <h3 className="text-xl font-semibold tracking-tight">A clean slate.</h3>
      <p className="text-muted-foreground max-w-xs text-sm">
        Add your first content idea above - articles, videos, podcasts, and newsletters all in one
        pipeline.
      </p>
    </div>
  );
}

// ── main board ────────────────────────────────────────────────────────────────

export function ContentBoard() {
  const [openId, setOpenId] = useState<string | null>(null);

  function toggleOpen(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  const items = useLiveQuery(async () => {
    const all = await getDb().content.toArray();
    return all.filter((c) => !c.deletedAt).sort(compareContentOrder);
  }, []);

  const domains = useLiveQuery(async () => {
    const all = await getDb().domains.toArray();
    return all.filter((d) => !d.deletedAt && !d.archivedAt);
  }, []);

  async function handleAdd(title: string, type: ContentType) {
    await createContent({ title, type });
  }

  const isLoading = items === undefined || domains === undefined;
  const isEmpty = !isLoading && items.length === 0;

  const byStatus = STATUSES.reduce<Record<ContentStatus, Content[]>>(
    (acc, s) => {
      acc[s.key] = items?.filter((c) => c.status === s.key) ?? [];
      return acc;
    },
    {} as Record<ContentStatus, Content[]>,
  );

  return (
    <div className="flex flex-col gap-4">
      {/* quick add */}
      <QuickAdd onAdd={handleAdd} />

      {isLoading ? (
        <div className="surface flex h-48 items-center justify-center">
          <span className="live-dot bg-primary inline-block size-2 rounded-full" />
        </div>
      ) : isEmpty ? (
        <EmptyState />
      ) : (
        <>
          {/* responsive kanban grid for larger screens */}
          <div className="hidden min-w-0 grid-cols-2 gap-3 lg:grid xl:grid-cols-4 2xl:grid-cols-7">
            {STATUSES.map((s) => (
              <Column
                key={s.key}
                status={s.key}
                label={s.label}
                items={byStatus[s.key]}
                domains={domains ?? []}
                openId={openId}
                onToggle={toggleOpen}
              />
            ))}
          </div>

          {/* grouped list - phone */}
          <div className="flex flex-col gap-5 lg:hidden">
            {STATUSES.map((s, i) => (
              <ListGroup
                key={s.key}
                status={s.key}
                label={s.label}
                items={byStatus[s.key]}
                domains={domains ?? []}
                openId={openId}
                onToggle={toggleOpen}
                defaultOpen={i < 3}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
