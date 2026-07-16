'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Lightbulb,
  MessageSquare,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { getDb } from '@ops-dashboard/core';
import type { Domain, Interaction, Person, PersonFact } from '@ops-dashboard/core';
import {
  deletePerson,
  makeFact,
  makeInteraction,
  updatePerson,
} from '@/lib/people';

// ─── Facts section ────────────────────────────────────────────────────────────

function FactsSection({ person }: { person: Person }) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');

  async function addFact() {
    const l = label.trim();
    const v = value.trim();
    if (!l || !v) return;
    const fact = makeFact(l, v);
    await updatePerson(person.id, { facts: [...person.facts, fact] });
    setLabel('');
    setValue('');
    setAdding(false);
  }

  async function removeFact(id: string) {
    await updatePerson(person.id, { facts: person.facts.filter((f) => f.id !== id) });
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
            Facts
          </span>
          {person.facts.length > 0 ? (
            <span className="font-mono text-[10px] text-subtle-foreground">
              ({person.facts.length})
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3" /> Add
        </button>
      </div>

      {adding ? (
        <div className="surface-flat flex flex-col gap-2 p-3">
          <input
            className="input"
            placeholder="Label (e.g. Birthday)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Escape') setAdding(false);
            }}
          />
          <input
            className="input"
            placeholder="Value (e.g. March 15)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addFact();
              if (e.key === 'Escape') setAdding(false);
            }}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-md px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addFact}
              disabled={!label.trim() || !value.trim()}
              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              Add fact
            </button>
          </div>
        </div>
      ) : null}

      {person.facts.length === 0 && !adding ? (
        <p className="text-xs text-subtle-foreground">No facts recorded yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {person.facts.map((fact) => (
            <FactRow key={fact.id} fact={fact} onRemove={() => removeFact(fact.id)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function FactRow({ fact, onRemove }: { fact: PersonFact; onRemove: () => void }) {
  return (
    <li className="group surface-flat flex items-center gap-2 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle-foreground">
            {fact.label}
          </span>
          <span className="text-sm text-foreground">{fact.value}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex size-6 items-center justify-center rounded opacity-0 text-muted-foreground transition-opacity hover:text-destructive group-hover:opacity-100"
        aria-label="Remove fact"
      >
        <X className="size-3.5" />
      </button>
    </li>
  );
}

// ─── Interactions section ─────────────────────────────────────────────────────

function InteractionsSection({ person }: { person: Person }) {
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');

  const sorted = [...person.interactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  async function addInteraction() {
    const n = note.trim();
    if (!n) return;
    const interaction = makeInteraction(n, date || undefined);
    await updatePerson(person.id, {
      interactions: [...person.interactions, interaction],
    });
    setNote('');
    setDate('');
    setAdding(false);
  }

  async function removeInteraction(id: string) {
    await updatePerson(person.id, {
      interactions: person.interactions.filter((i) => i.id !== id),
    });
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
            Interactions
          </span>
          {person.interactions.length > 0 ? (
            <span className="font-mono text-[10px] text-subtle-foreground">
              ({person.interactions.length})
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3" /> Log
        </button>
      </div>

      {adding ? (
        <div className="surface-flat flex flex-col gap-2 p-3">
          <textarea
            className="input resize-none"
            placeholder="What happened or was discussed?"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoFocus
          />
          <input
            type="date"
            className="input"
            placeholder="Date (defaults to today)"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-md px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addInteraction}
              disabled={!note.trim()}
              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              Log interaction
            </button>
          </div>
        </div>
      ) : null}

      {sorted.length === 0 && !adding ? (
        <p className="text-xs text-subtle-foreground">No interactions logged yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {sorted.map((interaction) => (
            <InteractionRow
              key={interaction.id}
              interaction={interaction}
              onRemove={() => removeInteraction(interaction.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function InteractionRow({
  interaction,
  onRemove,
}: {
  interaction: Interaction;
  onRemove: () => void;
}) {
  const date = parseISO(interaction.date);
  const relative = formatDistanceToNow(date, { addSuffix: true });

  return (
    <li className="group surface-flat flex gap-2.5 px-3 py-2.5">
      <div className="mt-0.5 flex-shrink-0">
        <Calendar className="size-3.5 text-muted-foreground" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{interaction.note}</p>
        <span className="font-mono text-[10px] text-subtle-foreground">{relative}</span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded opacity-0 text-muted-foreground transition-opacity hover:text-destructive group-hover:opacity-100"
        aria-label="Remove interaction"
      >
        <X className="size-3.5" />
      </button>
    </li>
  );
}

// ─── Meta / editable fields ───────────────────────────────────────────────────

function MetaSection({ person, domains }: { person: Person; domains: Domain[] }) {
  const [name, setName] = useState(person.name);
  const [relationship, setRelationship] = useState(person.relationship ?? '');

  async function saveName() {
    const n = name.trim();
    if (!n || n === person.name) return;
    await updatePerson(person.id, { name: n });
  }

  async function saveRelationship() {
    const r = relationship.trim();
    if (r === (person.relationship ?? '')) return;
    await updatePerson(person.id, { relationship: r || undefined });
  }

  async function setDomain(domainId: string) {
    await updatePerson(person.id, { domainId: domainId || undefined });
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="grid gap-2 text-sm">
        {/* Name */}
        <div className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-xs text-muted-foreground">Name</span>
          <input
            className="input flex-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        </div>
        {/* Relationship */}
        <div className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-xs text-muted-foreground">Relationship</span>
          <input
            className="input flex-1"
            placeholder="e.g. colleague, mentor, friend"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            onBlur={saveRelationship}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        </div>
        {/* Domain */}
        {domains.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-xs text-muted-foreground">Domain</span>
            <select
              value={person.domainId ?? ''}
              onChange={(e) => setDomain(e.target.value)}
              className="input flex-1"
            >
              <option value="">- none -</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface PersonDetailProps {
  person: Person;
  domains: Domain[];
  onClose: () => void;
  onDeleted: () => void;
}

export function PersonDetail({ person, domains, onClose, onDeleted }: PersonDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleDelete() {
    await deletePerson(person.id);
    onDeleted();
  }

  // Domain chip for header
  const domain = useLiveQuery(async () => {
    if (!person.domainId) return null;
    return (await getDb().domains.get(person.domainId)) ?? null;
  }, [person.domainId]);

  const initials = person.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <div
        ref={panelRef}
        className="relative z-10 flex h-full w-full max-w-lg flex-col bg-background shadow-2xl"
      >
        {/* Header */}
        <div className="hairline flex items-start justify-between border-b px-5 py-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
              {person.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={person.avatarUrl}
                  alt={person.name}
                  className="size-10 rounded-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <div>
              <h2 className="text-[15px] font-semibold leading-tight">{person.name}</h2>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                {person.relationship ? (
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle-foreground">
                    {person.relationship}
                  </span>
                ) : null}
                {domain ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-bg-sunken px-2 py-0.5">
                    <span
                      className="size-1.5 rounded-full"
                      style={{ background: domain.color }}
                      aria-hidden
                    />
                    <span className="font-mono text-[10px] text-subtle-foreground">
                      {domain.name}
                    </span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Delete */}
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-md bg-destructive px-2 py-1 text-xs font-medium text-destructive-foreground"
                >
                  Delete
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive"
                aria-label="Delete person"
              >
                <Trash2 className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="scrollbar-thin flex-1 overflow-y-auto p-5">
          <div className="flex flex-col gap-6">
            <MetaSection person={person} domains={domains} />

            <div className="hairline border-t" />
            <FactsSection person={person} />

            <div className="hairline border-t" />
            <InteractionsSection person={person} />
          </div>
        </div>
      </div>
    </div>
  );
}
