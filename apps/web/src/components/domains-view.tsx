'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Archive, Boxes, ChevronRight, ListTodo, Pencil, Plus, X } from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import type { Domain } from '@ops-dashboard/core';
import { archiveDomain, createDomain, updateDomain } from '@/lib/domains';
import { cn } from '@ops-dashboard/ui';

const PRESET_COLORS = [
  { label: 'Amber', value: 'oklch(0.65 0.18 38)' },
  { label: 'Sage', value: 'oklch(0.65 0.16 150)' },
  { label: 'Sky', value: 'oklch(0.62 0.16 200)' },
  { label: 'Violet', value: 'oklch(0.65 0.18 280)' },
  { label: 'Rose', value: 'oklch(0.68 0.18 350)' },
  { label: 'Sand', value: 'oklch(0.72 0.08 80)' },
  { label: 'Slate', value: 'oklch(0.55 0.03 260)' },
  { label: 'Teal', value: 'oklch(0.7 0.18 175)' },
];

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.label}
          onClick={() => onChange(c.value)}
          className={cn(
            'size-6 rounded-full transition-all ring-2 ring-offset-2 ring-offset-background',
            value === c.value ? 'ring-foreground scale-110' : 'ring-transparent hover:scale-105',
          )}
          style={{ background: c.value }}
        />
      ))}
    </div>
  );
}

interface DomainFormProps {
  initial?: Domain;
  onSave: (name: string, color: string, description: string) => Promise<void>;
  onCancel: () => void;
}

function DomainForm({ initial, onSave, onCancel }: DomainFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0]!.value);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim(), color, description.trim());
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface flex flex-col gap-3 p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
        {initial ? 'Edit domain' : 'New domain'}
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Domain name"
        className="input"
        autoFocus
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="input resize-none"
      />
      <div>
        <div className="mb-2 text-xs text-muted-foreground">Color</div>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {initial ? 'Save' : 'Create'}
        </button>
      </div>
    </form>
  );
}

function DomainCard({ domain }: { domain: Domain }) {
  const [editing, setEditing] = useState(false);

  const counts = useLiveQuery(async () => {
    const db = getDb();
    const [projects, tasks] = await Promise.all([
      db.projects.toArray().then((all) => all.filter((p) => !p.deletedAt && !p.archivedAt && p.domainId === domain.id)),
      db.tasks.toArray().then((all) =>
        all.filter((t) => !t.deletedAt && t.status !== 'archived' && t.status !== 'done' && t.domainId === domain.id),
      ),
    ]);
    return { projects: projects.length, tasks: tasks.length };
  }, [domain.id]);

  if (editing) {
    return (
      <DomainForm
        initial={domain}
        onSave={async (name, color, description) => {
          await updateDomain(domain.id, { name, color, description: description || undefined });
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div
      className={cn(
        'surface-flat group flex items-start gap-3 px-4 py-3',
        domain.archivedAt && 'opacity-60',
      )}
    >
      <span
        aria-hidden
        className="mt-0.5 size-4 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
        style={{ background: domain.color }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[14px] font-medium leading-5">{domain.name}</span>
          {domain.archivedAt ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
              archived
            </span>
          ) : null}
        </div>
        {domain.description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{domain.description}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-subtle-foreground">
          <span className="inline-flex items-center gap-1">
            <Boxes className="size-3" aria-hidden />
            {counts?.projects ?? 0} project{counts?.projects !== 1 ? 's' : ''}
          </span>
          <span className="inline-flex items-center gap-1">
            <ListTodo className="size-3" aria-hidden />
            {counts?.tasks ?? 0} open task{counts?.tasks !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      {!domain.archivedAt ? (
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            aria-label="Edit"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => archiveDomain(domain.id)}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            aria-label="Archive"
          >
            <Archive className="size-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function DomainsView() {
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const domains = useLiveQuery(async () => {
    const all = await getDb().domains.toArray();
    return all.filter((d) => !d.deletedAt).sort((a, b) => a.order - b.order);
  });

  const active = domains?.filter((d) => !d.archivedAt) ?? [];
  const archived = domains?.filter((d) => d.archivedAt) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {active.length} active domain{active.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            creating
              ? 'bg-bg-sunken text-muted-foreground'
              : 'bg-primary text-primary-foreground hover:opacity-90',
          )}
        >
          {creating ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
          {creating ? 'Cancel' : 'New domain'}
        </button>
      </div>

      {creating ? (
        <DomainForm
          onSave={async (name, color, description) => {
            await createDomain({ name, color, description: description || undefined, order: Date.now() });
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      ) : null}

      {domains === undefined ? (
        <ul className="flex flex-col gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} aria-hidden className="surface-flat h-16 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </ul>
      ) : active.length === 0 && !creating ? (
        <div className="surface flex h-60 flex-col items-center justify-center gap-2 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-subtle-foreground">domains</div>
          <h3 className="text-xl font-semibold tracking-tight">A clean slate.</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Domains are the top-level areas of your life. Create one to start organising your projects and tasks.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {active.map((d) => (
            <li key={d.id}>
              <DomainCard domain={d} />
            </li>
          ))}
        </ul>
      )}

      {archived.length > 0 ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <ChevronRight
              className={cn('size-3.5 transition-transform', showArchived && 'rotate-90')}
              aria-hidden
            />
            {archived.length} archived
          </button>
          {showArchived ? (
            <ul className="mt-2 flex flex-col gap-1.5">
              {archived.map((d) => (
                <li key={d.id}>
                  <DomainCard domain={d} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
